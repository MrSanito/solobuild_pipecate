#
# Copyright (c) 2025, Daily
#
# SPDX-License-Identifier: BSD 2-Clause License
#

import os

from dotenv import load_dotenv
from loguru import logger
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineParams, PipelineTask
from pipecat.processors.aggregators.llm_context import LLMContext
from pipecat.processors.aggregators.llm_response_universal import LLMContextAggregatorPair
from pipecat.runner.types import RunnerArguments
from pipecat.serializers.vobiz import VobizFrameSerializer, parse_vobiz_start
from pipecat.services.google.gemini_live.llm import GeminiLiveLLMService, GeminiVADParams
from pipecat.frames.frames import LLMRunFrame
from pipecat.transports.base_transport import BaseTransport
from pipecat.transports.websocket.fastapi import (
    FastAPIWebsocketParams,
    FastAPIWebsocketTransport,
)
from pipecat.adapters.schemas.function_schema import FunctionSchema
from pipecat.services.llm_service import FunctionCallParams
from pipecatcloud.agent import PipecatSessionArguments
from instructions import SYSTEM_PROMPT

# ── YASH / RENTOPUS KNOWLEDGE BASE & FUNCTION CALL ──

from tools import rentopus_info_tool


async def run_bot(transport: BaseTransport, handle_sigint: bool, gemini_api_key: str = None):
    logger.info("Initializing Yash (Rentopus Sales Voice Assistant)")
    llm = GeminiLiveLLMService(
        api_key=gemini_api_key or os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY"),
        settings=GeminiLiveLLMService.Settings(
            model="gemini-3.1-flash-live-preview",
            temperature=0.6,
            voice="Puck",
            language="hi-IN",
            vad=GeminiVADParams(),
            thinking={"thinking_budget": 256},
        ),
        tools=[rentopus_info_tool],
        system_instruction=SYSTEM_PROMPT
    )

    context = LLMContext()
    context_aggregator = LLMContextAggregatorPair(context, realtime_service_mode=True)

    pipeline = Pipeline(
        [
            transport.input(),  # Websocket input from client
            context_aggregator.user(),
            llm, 
            transport.output(),  # Websocket output to client
            context_aggregator.assistant(),
        ]
    )

    task = PipelineTask(
        pipeline,
        params=PipelineParams(
            audio_in_sample_rate=8000,   # Vobiz MULAW input (8kHz telephony)
            audio_out_sample_rate=24000, # Gemini TTS native (auto-resampled to 8kHz for Vobiz)
            enable_metrics=True,
            enable_usage_metrics=True,
        ),
    )

    @transport.event_handler("on_client_connected")
    async def on_client_connected(transport, client):
        logger.info("Starting outbound call conversation for Yash")
        context.add_message({
            "role": "user",
            "content": "User just answered the phone. Please greet them by saying 'नमस्ते, मैं Rentopus से यश बात कर रहा हूँ।'."
        })
        await task.queue_frames([LLMRunFrame()])

    @transport.event_handler("on_client_disconnected")
    async def on_client_disconnected(transport, client):
        logger.info("Outbound call ended")
        await task.cancel()

    runner = PipelineRunner(handle_sigint=handle_sigint)

    await runner.run(task)


async def bot(runner_args: RunnerArguments, call_id: str = None, stream_id: str = None, gemini_api_key: str = None):
    """Main bot entry point compatible with Pipecat Cloud."""
    # Extract gemini_api_key from query params if not explicitly passed
    if not gemini_api_key and hasattr(runner_args, "websocket") and runner_args.websocket:
        try:
            body_param = runner_args.websocket.query_params.get("body")
            if body_param:
                import base64
                import json
                decoded_json = base64.b64decode(body_param).decode("utf-8")
                body_data = json.loads(decoded_json)
                gemini_api_key = body_data.get("gemini_api_key")
                logger.info(f"Extracted gemini_api_key from WebSocket query parameters: ...{gemini_api_key[-4:] if gemini_api_key else 'None'}")
        except Exception as e:
            logger.warning(f"Could not extract gemini_api_key from websocket query params: {e}")

    handle_sigint = runner_args.handle_sigint

    # Check if this is a WebSocket-based telephony session
    if hasattr(runner_args, "websocket") and runner_args.websocket:
        # Read Vobiz's `start` event off the WebSocket to learn the negotiated
        # wire format (encoding + sample rate + IDs). Env vars are fallback hints.
        env_encoding = os.getenv("VOBIZ_ENCODING", "audio/x-mulaw")
        env_sample_rate = int(os.getenv("VOBIZ_SAMPLE_RATE", "8000"))

        parsed = await parse_vobiz_start(runner_args.websocket)
        logger.info(
            f"Vobiz start: callId={parsed['call_id']!r}, streamId={parsed['stream_id']!r}, "
            f"mediaFormat=({parsed['encoding']!r}, {parsed['sample_rate']})"
        )
        call_id = call_id or parsed["call_id"]
        stream_id = stream_id or parsed["stream_id"]
        vobiz_encoding = parsed["encoding"] or env_encoding
        vobiz_sample_rate = parsed["sample_rate"] or env_sample_rate

        serializer = VobizFrameSerializer(
            stream_id=stream_id,
            call_id=call_id,
            auth_id=os.getenv("VOBIZ_AUTH_ID", ""),
            auth_token=os.getenv("VOBIZ_AUTH_TOKEN", ""),
            params=VobizFrameSerializer.InputParams(
                vobiz_sample_rate=vobiz_sample_rate,
                encoding=vobiz_encoding,
                sample_rate=None,
                l16_byte_order=os.getenv("VOBIZ_L16_ENDIAN", "be"),
                auto_hang_up=True,
            ),
        )

        transport = FastAPIWebsocketTransport(
            websocket=runner_args.websocket,
            params=FastAPIWebsocketParams(
                audio_in_enabled=True,
                audio_out_enabled=True,
                add_wav_header=False,  # CRITICAL: Must be False for telephony
                serializer=serializer,
            ),
        )
    else:
        # Fall back to Daily WebRTC Room transport (for --use-daily CLI testing)
        from pipecat.transports.daily.transport import DailyTransport, DailyParams
        
        logger.info("Initializing bot in Daily WebRTC room mode for Yash")
        transport = DailyTransport(
            room_url=runner_args.room_url,
            token=runner_args.token,
            bot_name="Yash",
            params=DailyParams(
                audio_out_enabled=True,
                audio_in_enabled=True,
                camera_out_enabled=False,
            )
        )

    await run_bot(transport, handle_sigint, gemini_api_key=gemini_api_key)