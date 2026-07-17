# pipecatEnglish

A Pipecat AI voice agent built with a realtime speech-to-speech pipeline.

## How It Works

1. Your application triggers an outbound call
2. The bot creates a Daily room with dial-out capabilities
3. Daily initiates the outbound call to the specified phone number
4. When the call is answered, the bot joins the Daily room
5. The bot and the callee are connected, and the bot handles the conversation

## Configuration

- **Bot Type**: Telephony
- **Transport(s)**: Daily PSTN (Dial-out), SmallWebRTC
- **Pipeline**: Realtime
  - **Service**: Gemini Live

## Setup

1. Create a virtual environment and install dependencies

   ```bash
   uv sync
   ```

2. Set up environment variables

   Copy the example file and fill in your API keys:

    ```bash
    cp .env.example .env
    # Edit .env with your API keys
    ```

3. Buy a phone number

   Instructions on how to do that can be found at this [docs link:](https://docs.daily.co/reference/rest-api/phone-numbers/buy-phone-number)

4. Request dial-out enablement

   For compliance reasons, to enable dial-out for your Daily account, you must request enablement via the form. You can find out more about dial-out, and the form at the [link here](https://docs.daily.co/guides/products/dial-in-dial-out#main)

## Environment Configuration

The bot supports two deployment modes controlled by the `ENV` variable:

### Local Development (`ENV=local`)

- Uses your local server for handling dial-out requests and starting the bot
- Default configuration for development and testing

### Production (`ENV=production`)

- Bot is deployed to Pipecat Cloud; requires `PIPECAT_API_KEY` and `PIPECAT_AGENT_NAME`
- Set these when deploying to production environments
- Your FastAPI server runs either locally or deployed to your infrastructure


## Run the Bot Locally

You'll need two terminal windows open:

1. **Terminal 1**: Start the webhook server:

   ```bash
   uv run server.py
   ```

   This runs on port 8080 and handles dial-out requests.

2. **Terminal 2**: Start the bot server:

   ```bash
   uv run bot.py -t daily
   ```

   This runs on port 7860 and handles the bot logic.

3. **Test the dial-out functionality**

   With both servers running, send a dial-out request:

   ```bash
   curl -X POST "http://localhost:8080/dialout" \
     -H "Content-Type: application/json" \
     -d '{
       "dialout_settings": {
         "phone_number": "+1234567890"
       }
     }'
   ```

   The server will create a room, start the bot, and the bot will call the specified number. Answer the call to speak with the bot.

## Testing with evals

This project includes behavioral evals: scripted conversations that drive the bot headless — no live call needed. Starter scenarios live in `server/evals/`; edit them as your bot takes shape and copy them to add more.

From `server/`, run the bot with the eval transport, then drive scenarios against it from a second terminal (the bot stays up across runs):

```bash
uv run bot.py -t eval
# In another terminal:
uv run pipecat eval run evals/starter_audio.yaml -v   # full audio round trip (local models, no API keys)
```

`eval:` criteria are scored by a judge LLM — a local Ollama by default (`ollama pull gemma2:9b`). The comments in the scenario files cover the schema and how to use an OpenAI judge instead.

## Project Structure

pipecatEnglish/
├── server/              # Python bot server
│   ├── bot.py           # Main bot implementation
│   ├── server.py        # FastAPI webhook server for Daily PSTN dial-out
│   ├── server_utils.py  # Utility functions starting the bot
│   ├── pyproject.toml   # Python dependencies
│   ├── env.example      # Environment variables template
│   ├── .env             # Your API keys (git-ignored)
│   ├── Dockerfile       # Container image for Pipecat Cloud
│   └── pcc-deploy.toml  # Pipecat Cloud deployment config
├── .gitignore           # Git ignore patterns
└── README.md            # This file

This example is organized to be production-ready and easy to customize:
- **`server.py`** - FastAPI server that handles dial-out requests

  - Receives dial-out requests via `/dialout` endpoint
  - Creates Daily rooms with dial-out capabilities
  - Routes to local or production bot deployment
  - Uses shared HTTP session for optimal performance


- **`server_utils.py`** - Utility functions for Daily API interactions

  - Data models for call data and agent requests
  - Room creation logic
  - Bot starting logic (production and local modes)
  - Easy to extend with custom business logic

- **`bot.py`** - The voice bot implementation
  - `DialoutManager` class for retry logic
  - Handles the conversation with the person being called
  - Deployed to Pipecat Cloud in production or run locally for development
## Building with an AI coding agent

Extending this bot with Claude Code, Codex, or another AI coding assistant? Give it live, accurate Pipecat context instead of stale training data with the **Pipecat Context Hub** — a local index of Pipecat docs, examples, and API source your agent queries over MCP:

```bash
# Build the local index (first run takes a couple of minutes)
uvx pipecat-ai-context-hub@latest refresh

# Add it to your agent (use the line for the one you use)
claude mcp add pipecat-context-hub -- uvx pipecat-ai-context-hub serve   # Claude Code
codex mcp add pipecat-context-hub -- uvx pipecat-ai-context-hub serve    # Codex
```

MCP servers load at session start, so add it before opening your coding session. See the [Pipecat Context Hub docs](https://docs.pipecat.ai/api-reference/context-hub) for the full setup.

## Learn More

- [Pipecat Documentation](https://docs.pipecat.ai/)
- [Pipecat GitHub](https://github.com/pipecat-ai/pipecat)
- [Pipecat Examples](https://github.com/pipecat-ai/pipecat-examples)
- [Discord Community](https://discord.gg/pipecat)