# Pipecat Pre-Warming Worker Pool Architecture

This folder contains a production-ready example of how to run multiple Pipecat agents (bots) at the same time and route incoming users to them with minimal latency.

## How it works

1. `main.py` acts as the **Master Router**.
2. When `main.py` starts, it automatically spawns 4 background processes (Workers) on ports 8001, 8002, 8003, and 8004.
3. Each worker process loads the Pipecat libraries and Pipecat bot logic into memory, keeping them "warm".
4. The Master Router runs on port 8000 and keeps track of which workers are `IDLE` or `BUSY`.

## The Frontend Flow

To use this in your Next.js application, your frontend needs to make a quick HTTP request to get an idle worker before opening the WebSocket.

```javascript
// 1. Ask the Master Router for an available pre-warmed agent
const response = await fetch("http://localhost:8000/get_idle_worker");
const data = await response.json();

if (data.ws_url) {
    // 2. Connect the WebSocket directly to the idle agent for instant response
    const ws = new WebSocket(data.ws_url);
    
    // ... start sending/receiving audio ...
    
    ws.onclose = () => {
        // 3. Tell the Master Router the call is over so the agent can be used again
        fetch("http://localhost:8000/release_worker", {
            method: "POST",
            body: JSON.stringify({ port: data.port })
        });
    }
}
```

## How to Run

1. Make sure you have your `.env` variables set (you can copy your `.env` file from `pipecat-quickstart/server` to this folder).
2. Install the necessary dependency:
   ```bash
   pip install requests
   ```
3. Run the master router:
   ```bash
   python main.py
   ```

You will see the Master Router start on port 8000, and 4 background agents start on ports 8001-8004.
