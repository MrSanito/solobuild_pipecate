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
from instructions import SYSTEM_INSTRUCTION


load_dotenv(override=True)

# ── YASH / RENTOPUS KNOWLEDGE BASE & FUNCTION CALL ──

from tools import rentopus_info_tool


async def run_bot(
    transport: BaseTransport, 
    handle_sigint: bool, 
    gemini_api_key: str = None,
    contact_name: str = None,
    contact_number: str = None,
    customer_number: str = None
):
    logger.info("Initializing Yash (Rentopus Sales Voice Assistant)")
    llm = GeminiLiveLLMService(
        api_key=gemini_api_key or os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY"),
        settings=GeminiLiveLLMService.Settings(
            model="gemini-3.1-flash-live-preview",
            temperature=0.6,
            voice="Puck",
            language="en-US",
            vad=GeminiVADParams(
                start_sensitivity="START_SENSITIVITY_HIGH",
                end_sensitivity="END_SENSITIVITY_LOW",
                prefix_padding_ms=0,
                silence_duration_ms=500,
            ),
            thinking={"thinking_budget": 0},
        ),
        tools=[rentopus_info_tool],
        system_instruction=SYSTEM_INSTRUCTION
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
        if contact_name:
            greeting_prompt = f"User just answered the phone. Please greet them exactly by saying: 'Hello {contact_name}... Yash this side from Rentopus.' Make sure to pause slightly after their name."
        else:
            greeting_prompt = "User just answered the phone. Please greet them exactly by saying: 'Hello... Yash this side from Rentopus.' Make sure to pause slightly after hello."
            
        if customer_number:
            greeting_prompt += f" For your context, their customer number is {customer_number}."
            
        context.add_message({
            "role": "user",
            "content": greeting_prompt
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
    contact_name = None
    contact_number = None
    customer_number = None

    # Extract gemini_api_key and contact details from query params if not explicitly passed
    if not gemini_api_key and hasattr(runner_args, "websocket") and runner_args.websocket:
        try:
            body_param = runner_args.websocket.query_params.get("body")
            if body_param:
                import base64
                import json
                decoded_json = base64.b64decode(body_param).decode("utf-8")
                body_data = json.loads(decoded_json)
                logger.info(f"body_data: {body_data}")
                gemini_api_key = body_data.get("gemini_api_key")
                contact_name = body_data.get("name")
                contact_number = body_data.get("mobile_number")
                customer_number = body_data.get("customer_number")
                logger.info(f"Extracted contact info: Name={contact_name}, Number={contact_number}, Customer#={customer_number}")
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
        # Fall back to standard WebRTC (for local dashboard testing)
        from pipecat.runner.utils import create_transport
        from pipecat.transports.base_transport import TransportParams
        
        logger.info("Initializing bot in standard WebRTC mode for local testing")
        transport_params = {
            "webrtc": lambda: TransportParams(audio_in_enabled=True, audio_out_enabled=True),
        }
        transport = await create_transport(runner_args, transport_params)

    await run_bot(
        transport, 
        handle_sigint, 
        gemini_api_key=gemini_api_key,
        contact_name=contact_name,
        contact_number=contact_number,
        customer_number=customer_number
    )
 