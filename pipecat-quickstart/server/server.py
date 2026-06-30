from fastapi import FastAPI
from pipecat.runner.types import RunnerArguments
import asyncio
import uvicorn
from bot import bot
import inspect
print(inspect.signature(RunnerArguments.__init__))

from pipecat.runner.utils import create_transport
import inspect
print(inspect.getsource(create_transport))
from pipecat.runner.types import DailyRunnerArguments

app = FastAPI()

@app.get("/start")
async def start():
    args = DailyRunnerArguments(
        room_url="https://rentops.daily.co/av3t0wtYPCiph0AJ02CS",
        token="",
    )   
    asyncio.create_task(bot(args))
    return {"status": "started"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)