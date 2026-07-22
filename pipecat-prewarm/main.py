import asyncio
import os
import uvicorn
import multiprocessing
import requests
import time
from fastapi import FastAPI, WebSocket, Request, Response
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import websockets

# Global list of worker ports
WORKER_PORTS = [8001, 8002, 8003, 8004]

# Keep track of worker statuses
# We assume a worker is "IDLE" if it's running but not connected to a call
worker_status = {port: "STARTING" for port in WORKER_PORTS}

def start_worker(port):
    """
    This function runs in a separate process.
    It starts a FastAPI server on the given port.
    """
    print(f"[Worker {port}] Starting pre-warmed agent process...")
    # We dynamically create a FastAPI app for the worker
    from bot import bot
    from pipecat.runner.types import RunnerArguments
    from fastapi import FastAPI, WebSocket
    from fastapi.middleware.cors import CORSMiddleware
    import uvicorn

    worker_app = FastAPI()
    worker_app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @worker_app.get("/status")
    async def get_status():
        # A simple health check to let the master know we are alive and idle
        return {"status": "IDLE"}

    @worker_app.websocket("/ws")
    async def websocket_endpoint(websocket: WebSocket):
        await websocket.accept()
        print(f"[Worker {port}] WebSocket connected. Starting Pipecat bot...")
        
        # We start the bot for this connection
        class FakeArgs:
            def __init__(self, ws):
                self.websocket = ws
                self.handle_sigint = False
                
        runner_args = FakeArgs(websocket)
        
        # We run the bot. This will block until the call finishes.
        try:
            await bot(runner_args)
        except Exception as e:
            print(f"[Worker {port}] Call ended with error: {e}")
            
        print(f"[Worker {port}] Call finished. Worker returning to IDLE state.")
        # When call finishes, websocket is closed, worker goes back to idle automatically
        # because the next request to /ws will just start a new bot session.
        
    uvicorn.run(worker_app, host="0.0.0.0", port=port, log_level="warning")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # On Startup: Spawn the worker processes
    processes = []
    for port in WORKER_PORTS:
        p = multiprocessing.Process(target=start_worker, args=(port,))
        p.start()
        processes.append(p)
        
    # Give them a few seconds to start
    await asyncio.sleep(3)
    for port in WORKER_PORTS:
        worker_status[port] = "IDLE"
        
    yield
    
    # On Shutdown: Kill workers
    for p in processes:
        p.terminate()
        p.join()

# Master Router App
app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/get_idle_worker")
async def get_idle_worker():
    """
    The frontend calls this endpoint BEFORE opening the WebSocket.
    It returns the ws URL of an idle worker.
    """
    for port in WORKER_PORTS:
        if worker_status[port] == "IDLE":
            # Very basic check to ensure it's actually alive
            try:
                resp = requests.get(f"http://127.0.0.1:{port}/status", timeout=1)
                if resp.status_code == 200:
                    # Mark it busy (in a real app, the worker would ping back or use Redis)
                    worker_status[port] = "BUSY" 
                    return {"ws_url": f"ws://127.0.0.1:{port}/ws", "port": port}
            except Exception as e:
                pass
                
    return JSONResponse(status_code=503, content={"error": "No idle agents available. Please try again in a few seconds."})

@app.post("/release_worker")
async def release_worker(request: Request):
    """
    Frontend calls this when the call is over to release the port back to the pool.
    """
    data = await request.json()
    port = data.get("port")
    if port in worker_status:
        worker_status[port] = "IDLE"
    return {"status": "success"}

@app.api_route("/answer", methods=["GET", "POST"])
async def get_answer_xml(request: Request):
    # Find an idle worker
    idle_port = None
    for port in WORKER_PORTS:
        if worker_status[port] == "IDLE":
            try:
                resp = requests.get(f"http://127.0.0.1:{port}/status", timeout=1)
                if resp.status_code == 200:
                    worker_status[port] = "BUSY"
                    idle_port = port
                    break
            except Exception:
                pass
                
    if not idle_port:
        return Response(content="<Response><Reject/></Response>", media_type="application/xml")

    # Build the response XML pointing to the proxy
    host = request.headers.get("host", "localhost:8000")
    protocol = "wss" if "ngrok" in host else "ws"
    
    xml_content = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Stream bidirectional="true" audioTrack="inbound" contentType="audio/x-mulaw;rate=8000" keepCallAlive="true">
        {protocol}://{host}/ws/{idle_port}
    </Stream>
</Response>"""
    return Response(content=xml_content, media_type="application/xml")

@app.websocket("/ws/{port}")
async def ws_proxy(websocket: WebSocket, port: int):
    await websocket.accept()
    try:
        async with websockets.connect(f"ws://127.0.0.1:{port}/ws") as backend_ws:
            async def forward_to_backend():
                try:
                    while True:
                        data = await websocket.receive()
                        if "text" in data:
                            await backend_ws.send(data["text"])
                        elif "bytes" in data:
                            await backend_ws.send(data["bytes"])
                except Exception:
                    pass

            async def forward_to_client():
                try:
                    async for message in backend_ws:
                        if isinstance(message, str):
                            await websocket.send_text(message)
                        else:
                            await websocket.send_bytes(message)
                except Exception:
                    pass

            t1 = asyncio.create_task(forward_to_backend())
            t2 = asyncio.create_task(forward_to_client())
            done, pending = await asyncio.wait([t1, t2], return_when=asyncio.FIRST_COMPLETED)
            for task in pending:
                task.cancel()
    except Exception as e:
        print(f"Proxy error: {e}")
    finally:
        # Auto-release worker back to idle pool
        worker_status[port] = "IDLE"


if __name__ == "__main__":
    print("Starting Master Router on port 8000...")
    uvicorn.run("main:app", host="0.0.0.0", port=7860, reload=False)
