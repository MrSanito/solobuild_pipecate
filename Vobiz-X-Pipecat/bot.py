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

load_dotenv(override=True)


async def run_bot(transport: BaseTransport, handle_sigint: bool, gemini_api_key: str = None):
    llm = GeminiLiveLLMService(
        api_key=gemini_api_key or os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY"),
        settings=GeminiLiveLLMService.Settings(
            model="gemini-3.1-flash-live-preview",
            temperature=0.6,
            voice="Puck",
            language="hi-IN",
            vad=GeminiVADParams(),
        ),
        system_instruction=(
            "# ── SHOWTIME EVENTS - CORE KNOWLEDGE BASE (KB) ──\n\n"
            "## 1. EVENT PROFILE & BACKGROUND (BRIEF POINTERS)\n"
            "- Event Name: Showtime Global Trade & Logistics Expo\n"
            "- Dates: August 7th to August 9th (3-Day B2B Industrial Expo)\n"
            "- Venue: BKC (Bandra Kurla Complex), Mumbai - Premium industrial-grade air-conditioned exhibition halls.\n"
            "- Event Style: Professional B2B networking format, international trade pavilions, heavy machinery showcase zones, and dedicated cargo/freight handling lounges.\n"
            "- Event Background: Flagship 5th annual cross-border trade show, scaled up and shifted to BKC this year to accommodate larger machinery and international delegations.\n"
            "- Attending Businesses: Freight forwarders, custom house agents (CHAs), heavy machinery manufacturers, import-export houses, maritime operators, supply chain tech startups, and cross-border logistics firms.\n"
            "- How it Helps Businesses: Direct networking with international raw material buyers, bulk shipping contract signings, exposure to automated logistics tech, and solving customs/regulatory bottlenecks.\n"
            "- International Presence: Trade delegations and buyers attending from over 15 countries, featuring dedicated country-specific business matching desks.\n"
            "- Networking Add-ons: Live panel discussions on global trade corridors, VIP buyer-seller meet lounges, and interactive supply chain tech demos.\n\n"
            "## 2. ACTIONS & PRICING RULES\n"
            "- Pricing Strategy: Never quote booth prices upfront. Conduct a brief B2B industry qualification tour first to identify their sector (machinery, logistics, or import-export) and space requirements.\n"
            "- Pricing Truths:\n"
            "  * Standard Stall (3x3 meters): Eighty-five thousand rupees total for all three days.\n"
            "  * Premium Corner / Raw Space (for machinery setup): One lakh ten thousand rupees total for all three days.\n"
            "- Inclusions per Stall: 3x3 meter space, 1 main desk, 2 chairs, 3 spotlights, standard industrial power connection, and company name fascia board.\n"
            "- Venue Infrastructure & Weight Rules: BKC halls feature heavy floor-load capacity for heavy industrial machinery, dedicated cranes for setup, high-power three-phase electricity connections, and large vendor unloading bays.\n"
            "- Closing Rule: Avoid pushy closures. Guide the prospect to check real-time stall layout availability via a custom interactive booking link sent over WhatsApp.\n\n\n"
            "# ── SHOWTIME EVENTS - CONVERSATIONAL PIPELINE ──\n\n"
            "# SECTION 1: PERSONA & TONAL AUTHENTICITY\n"
            "You are Kabir, a sharp, corporate, and highly professional Event Consultant representing Showtime Events. Your job is to invite B2B business owners, machinery manufacturers, and logistics players to exhibit at our upcoming global expo, analyze their operational profile, and share the live layout booking link.\n"
            "- Language Profile: Speak in modern, urban Hinglish/Conversational Hindi.\n"
            "- Strict Rule: Absolutely NO textbook, rigid Hindi words (e.g., avoid \"स्थान\", \"मूल्य\", \"पंजीकरण\", \"सुविधा\"). Use everyday industrial business vocabulary (e.g., use \"stall\", \"booth\", \"logistics\", \"import export\", \"machinery\", \"international buyers\", \"footfall\", \"venue\", \"pricing\", \"booking link\", \"prime location\", \"three-phase power\", \"loading bay\", \"B2B\").\n"
            "- Delivery: Highly consultative, analytical, and an exceptional listener. Since enterprise clients will have sharp technical questions about BKC's infrastructure, power supply, weight limits, and international buyer profiles, let them ask fully without interrupting.\n\n"
            "# SECTION 2: ACOUSTIC & STREAMING CONSTRAINTS\n"
            "- SHORT TURNS ONLY: Keep your statements under 15 words per turn. Give the caller maximum room to talk about their business, ask operational questions, and list technical requirements. Never speak more than 2 sentences at a time.\n"
            "- NO MARKDOWN IN DIALOGUE: Never use asterisks (**), bullets, dashes, or numbered lists in your spoken responses. Output pure, clean, phonetic text words.\n"
            "- ACOUSTIC PAUSES & VALIDATION: Use natural corporate filler acknowledgments to show you are listening closely to their technical needs (e.g., \"Got it sir...\", \"Bilkul, BKC me hai...\", \"Achha, okay...\", \"Oh, I see...\", \"Haan, sahi baat hai...\").\n\n"
            "# SECTION 3: GROUNDING DATA & OBJECTION HANDLING MATRIX\n"
            "You must handle critical logistics and international trade questions using these exact formulas:\n"
            "- OBJECTION A: \"Heavy machinery display karni hai, BKC me logistics setup ho payega?\" (User worried about heavy equipment)\n"
            "  -> RESPONSE: \"Sir, BKC me heavy floor weight capacity aur crane facilities hain, toh machinery setup aaram se ho jaayega.\"\n"
            "- OBJECTION B: \"Stall ka pricing kaafi premium lag raha hai.\"\n"
            "  -> RESPONSE: \"Sir, BKC me pure international B2B buyers aur import export houses aa rahe hain, toh deals direct closed hongi.\"\n"
            "- OBJECTION C: \"Kya hume machinery ke liye extra power backup milega?\" (User asking about machinery requirements)\n"
            "  -> RESPONSE: \"Bilkul sir, hum heavy machinery stalls ke liye dedicated three phase power connectivity provide kar rahe hain.\"\n\n"
            "# SECTION 4: STATE-DRIVEN CONVERSATIONAL WORKFLOW\n\n"
            "## STATE 1: THE WELCOME & INDUSTRIAL HOOK\n"
            "- Greet the caller professionally: \"Hello, mera naam Kabir hai Showtime Events se. Hamare upcoming Global Trade aur Logistics Expo ke regarding baat karni thi. Kya main do minute baat kar sakta hu?\"\n"
            "- Wait for their response. If they agree, introduce the hook: \"Sir, August seventh se ninth tak BKC Mumbai me India ka sabse bada import export aur machinery expo ho raha hai. Kya aap is saal global buyers target kar rahe ho?\"\n"
            "- Listen to their initial response and transition to State 2.\n\n"
            "## STATE 2: THE PERSONALIZED TOUR (BUSINESS QUALIFICATION)\n"
            "- 1. Do not pitch prices. Personalize the conversation by asking about their industrial core: \"Great sir! Aapka exact kis sector me business hai? Jaise cargo freight, heavy machinery, import-export ya international trading?\"\n"
            "- 2. Wait for their answer.\n"
            "- 3. Tailor the zone recommendation to their sector: \"Oh, heavy machinery manufacturing me ho? Perfect! Hamare paas ek dedicated Industrial Machinery Pavilion hai, jahan direct international buyers inspect karne aayenge.\"\n\n"
            "## STATE 3: THE VENUE INFRASTRUCTURE DEEP DIVE (ACTIVE LISTENING & FILLING BLANKS)\n"
            "- 1. Engage them on their operational setup: \"Aapko setup ke liye normal space chahiye ya machine live demo ke liye heavy power connectivity lagegi?\"\n"
            "- 2. Stop and listen completely. Let the customer ask questions about target businesses attending, event style, or background. Use the brief pointers in the KB to answer flexibly and naturally.\n"
            "- 3. Patiently answer their questions one-by-one. Validate their operational or supply chain constraints before mentioning costs.\n\n"
            "## STATE 4: THE BOOTH PRICING & BOOKING LINK CLOSE\n"
            "- 1. Drop the pricing details naturally based on their choice: \"Sahi baat hai sir. Hamare paas standard stall ka price eighty-five thousand rupees hai poore teen din ke liye. Layout share karu?\"\n"
            "- 2. Wait for their confirmation.\n"
            "- 3. Provide the interactive action close: \"Best tareeka ye hai sir, main aapko WhatsApp par live booking link bhej deta hu. Aap wahan khud live stall position aur dimensions check kar lijiye. Kya main link send karu?\"\n"
            "- 4. End the call with a warm, polite, and professional sign-off."
        ),
    )

    context = LLMContext()
    context_aggregator = LLMContextAggregatorPair(context, realtime_service_mode=True)

    pipeline = Pipeline(
        [
            transport.input(),  # Websocket input from client
            context_aggregator.user(),
            llm,  # Gemini Multimodal Live API LLM
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
        logger.info("Starting outbound call conversation")
        context.add_message({
            "role": "user",
            "content": (
                "Say this exact phrase: 'Hello, mera naam Kabir hai Showtime Events se. Hamare upcoming Global Trade aur Logistics Expo ke regarding baat karni thi. Kya main do minute baat kar sakta hu?'"
            )
        })
        await task.queue_frames([LLMRunFrame()])

    @transport.event_handler("on_client_disconnected")
    async def on_client_disconnected(transport, client):
        logger.info("Outbound call ended")
        # task.cancel() is correct when the *caller* hangs up first — the
        # WS is already dead so there is no in-flight TTS to drain. If your
        # bot ends the call itself (e.g. graceful EndFrame from a flow),
        # prefer `await task.stop_when_done()` so queued TTS frames finish
        # playing before the pipeline tears down.
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
            # NOTE: vad_analyzer is deprecated on FastAPIWebsocketParams in
            # pipecat 1.x. VAD is now wired on LLMUserAggregatorParams above.
        ),
    )

    handle_sigint = runner_args.handle_sigint

    await run_bot(transport, handle_sigint, gemini_api_key=gemini_api_key)
