import os
from google.genai import types as google_types

from dotenv import load_dotenv
from loguru import logger
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.worker import PipelineParams, PipelineWorker
from pipecat.processors.aggregators.llm_context import LLMContext
from pipecat.processors.aggregators.llm_response_universal import LLMContextAggregatorPair
from pipecat.runner.types import RunnerArguments
from pipecat.runner.utils import create_transport
from pipecat.services.google.gemini_live.llm import GeminiLiveLLMService, GeminiVADParams
from pipecat.transports.base_transport import BaseTransport, TransportParams
from pipecat.workers.runner import WorkerRunner
from pipecat.frames.frames import LLMMessagesAppendFrame, LLMRunFrame
from pipecat.adapters.schemas.function_schema import FunctionSchema
from pipecat.services.llm_service import FunctionCallParams


load_dotenv(override=True)


async def run_bot(transport: BaseTransport, runner_args: RunnerArguments) -> None:
    logger.info("Starting Gemini Live bot")

    async def get_rentopus_info(params: FunctionCallParams) -> None:
        query = params.arguments.get("query", "").lower()
        logger.info(f"get_rentopus_info tool called with query: {query}")
        
        result = {}
        
        # 1. Clothing categories & types (should be early because questions like "Do you support bridal wear" contain "support" and "wear")
        clothing_keywords = ["clothing", "type", "bridal", "lehenga", "sherwani", "saree", "ethnic", "garment", "wear", "rental", "renting"]
        has_clothing = any(k in query for k in clothing_keywords) or ("rent" in query and "rentopus" not in query)
        
        if has_clothing:
            result = {
                "clothing_types": "Rentopus works for all clothing rental categories, including bridal wear, lehengas, sherwanis, ethnic wear, sarees, costumes, western formals, sportswear, and more.",
                "durations": "Flexible enough to support daily, weekly, and monthly rental cycles, multiple size variants per item, and custom rental durations."
            }
        # 2. POS support (should be checked before VAT because POS query might contain "billing")
        elif any(k in query for k in ["pos", "point of sale", "retail", "billing"]):
            result = {
                "pos_support": "Yes, Rentopus includes a built-in POS system at no extra charge.",
                "features": "Manage both retail sales and rental transactions from the same platform. Create bills, apply discounts, record payments, and share digital receipts with customers via WhatsApp or email."
            }
        # 3. VAT compliance
        elif any(k in query for k in ["gst", "tax", "invoice", "bill"]):
            result = {
                "gst_compliance": "Yes, Rentopus is fully VAT-compliant. It generates VAT-ready invoices and bills.",
                "features": "You can configure your VATIN, HSN/SAC codes, and tax rates. Bills automatically calculate the correct VAT breakdown and can be shared digitally with customers via WhatsApp."
            }
        # 4. Pricing / Plans / Trial
        elif any(k in query for k in ["price", "pricing", "starter", "growth", "pro", "cost", "charge", "trial", "free", "money", "fee"]):
            result = {
                "starter_plan": "39 AED per month (or 390 AED per year if billed annually, saving two months). Includes up to 100 inventory items and 2 salesman accounts.",
                "growth_plan": "69 AED per month (or 690 AED per year if billed annually). Includes unlimited inventory items and 10 salesman accounts.",
                "pro_plan": "119 AED per month (or 1,190 AED per year if billed annually). Includes unlimited inventory items, unlimited salesman accounts, and priority support.",
                "free_trial": "30-day free trial with no credit card required. You can test all features before subscribing.",
                "general_note": "No hidden charges, no long-term contracts, cancel anytime."
            }
        # 5. Data safety / security
        elif any(k in query for k in ["security", "safe", "data", "backup", "encryption"]):
            result = {
                "data_security": "Rentopus uses bank-grade encryption for all data in transit and at rest.",
                "backups": "Automated daily backups ensure that no data is ever permanently lost.",
                "infrastructure": "Hosted on secure cloud infrastructure. Customer records, booking history, and inventory are never shared with third parties. Multi-user access includes role-based permissions."
            }
        # 6. Technical requirements
        elif any(k in query for k in ["technical", "tech", "knowledge", "learn", "difficult", "skill", "coding", "code"]):
            result = {
                "technical_skills": "No technical knowledge or coding skills are required to use Rentopus. If you can use WhatsApp or Instagram, you can use Rentopus.",
                "onboarding": "Our onboarding team will personally guide you through the entire setup in your preferred language (Arabic or English) at your own pace, with live support available throughout."
            }
        # 7. Setup & Import
        elif any(k in query for k in ["setup", "start", "excel", "import"]):
            result = {
                "setup_time": "Most businesses are fully set up and taking bookings within one day.",
                "inventory_import": "You can bulk-upload existing inventory using a simple Excel template (item names, quantities, categories, rental rates). The onboarding team assists with this import at no extra charge."
            }
        # 8. Cancellation
        elif any(k in query for k in ["cancel", "contract", "cancellation"]):
            result = {
                "cancellation": "You can cancel your subscription at any time from your account settings. There are no long-term contracts or lock-in periods.",
                "data_retention": "You retain access until the end of the current billing period. Your data is kept securely for 30 days after cancellation, during which you can export it in full."
            }
        # 9. Support & Contact
        elif any(k in query for k in ["support", "help", "contact", "phone", "email", "number", "address"]):
            result = {
                "support_channels": "Support is available via WhatsApp and email, communicating with a real person (not a chatbot).",
                "working_hours": "Monday to Saturday, 9 AM to 6 PM VAT (Gulf Standard Time). Most queries are resolved within a few hours.",
                "contact_details": "Phone: +971-4-123-4567, Email: info@whitecoretechnology.com"
            }
        else:
            result = {
                "about": "Rentopus is the top clothing rental software to run and grow your rental business easily in one reliable cloud-based platform. Trusted by 100+ businesses across the UAE.",
                "features": "Helps you digitize your clothing rental shop in under a day. Manage bookings, inventory, deliveries, returns, payments, and invoices in one place, avoiding double-bookings.",
                "plans": "Starter (39 AED/mo), Growth (₹1499/mo), Pro (₹2499/mo) with a 30-day free trial. No credit card required.",
                "founders": "Dipak Italiya and Nitin Lakum. Founded in 2022 by White Core Technology Dubai, Dubai, UAE."
            }
            
        await params.result_callback(result)

    rentopus_info_tool = FunctionSchema(
        name="get_rentopus_info",
        description="Get information about Rentopus software, pricing plans, features, VAT compliance, data safety, POS support, installation/setup, customer support, and cancellation details from the website.",
        properties={
            "query": {
                "type": "string",
                "description": "The query/topic to search website information about. E.g., 'pricing plans', 'VAT compliance', 'POS billing', 'data security', 'setup / import', 'support', 'cancellation'."
            }
        },
        required=["query"],
        handler=get_rentopus_info
    )

    llm = GeminiLiveLLMService(
        api_key=os.getenv("GEMINI_API_KEY"),
        settings=GeminiLiveLLMService.Settings(
            model="gemini-3.1-flash-live-preview",
            temperature=0.5,
            voice="Zephyr",  # requested voice
            language="en-US",  # American English
            vad=GeminiVADParams(),
            thinking={"thinking_budget": 256},
        ),
        system_instruction=(
            "# ── VIHAARA TOURS AND TRAVELS - CORE KNOWLEDGE BASE (KB) ──\n\n"
            "## 1. COMPANY & SERVICE PROFILE\n"
            "- Company Name: Vihaara Tours and Travels\n"
            "- Scale: Operating in 20+ international countries.\n"
            "- Offerings: Both standard group packages and highly customized personal trips.\n"
            "- Core Promise: End-to-end hassle-free travel planning.\n\n"
            "## 2. THE 7-POINT ITINERARY CHECKLIST (MANDATORY DATA)\n"
            "You must collect these exact 7 details from the customer naturally during the conversation to build their plan:\n"
            "1. Destination (Where are they going?)\n"
            "2. Check-in & Check-out dates (When are they traveling?)\n"
            "3. Number of people (Adults and kids)\n"
            "4. Budget (Approximate spending limit per person or total)\n"
            "5. Meal Plan (Veg/Non-veg preferences, and if they need daily breakfast included)\n"
            "6. Vehicle/Transport (Do they need private cabs/local transport included?)\n"
            "7. Custom Requirements (Any special requests like beach-view rooms, romantic dinners, adventure sports, etc.)\n\n"
            "## 3. THE \"HOW WE BUILD YOUR PLAN\" PROCESS (TRUST BUILDING)\n"
            "- Step 1: The destination experts analyze the customer's exact vibe and budget.\n"
            "- Step 2: The team handpicks the best-rated hotels, filters the optimal flight routes, and maps out a day-by-day local experience.\n"
            "- Step 3: A complete, transparent itinerary PDF with final pricing is shared with the customer within 24 hours.\n\n"
            "## 4. PRICING & CLOSING RULES\n"
            "- Never give an instant total price or flight cost on the call.\n"
            "- Tell the customer the final itinerary and pricing will be shared within 24 hours via WhatsApp/Email.\n\n\n"
            "# ── VIHAARA TOURS - CONVERSATIONAL PIPELINE ──\n\n"
            "# SECTION 1: PERSONA & TONAL AUTHENTICITY\n"
            "You are Mariam, a warm, enthusiastic, and highly hospitable Female Travel Expert at Vihaara Tours and Travels. Your job is to gather the customer's travel requirements for their international trip while making them feel excited and pampered.\n"
            "- Language Profile: Speak in clear, professional Emirati English with a warm Dubai Sheikh cadence.\n"
            "- Tone: Extremely warm, friendly, and \"tour guide-esque.\" You should sound like you are genuinely excited to help them plan their dream vacation.\n"
            "- Strict Rule: Absolutely no Hindi, Hinglish, or Indian slang/phrasing. Speak in prestigious Emirati English, welcoming the user with warmth. Use travel-friendly English words (e.g., \"vibe\", \"explore\", \"memories\", \"relax\", \"itinerary\", \"stay\").\n\n"
            "# SECTION 2: ACOUSTIC & STREAMING CONSTRAINTS\n"
            "- SHORT TURNS ONLY: Keep your statements strictly under 15 words. Never ask more than 1 question at a time.\n"
            "- ONE QUESTION POLICY: Ask exactly one question per turn. Wait for the customer's full response before moving to the next item on your checklist. No double-barreled questions.\n"
            "- NO MARKDOWN IN DIALOGUE: Never use asterisks (**), bullets, dashes, or numbered lists in your spoken responses. Output pure, clean, phonetic text words.\n"
            "- ACOUSTIC PAUSES & EMPATHY: Use excited filler acknowledgments (e.g., \"Wow, Bali is beautiful...\", \"Oh, perfect...\", \"I understand completely...\", \"How exciting!\").\n\n"
            "# SECTION 3: STATE-DRIVEN CONVERSATIONAL WORKFLOW\n\n"
            "## STATE 1: THE WARM WELCOME & DESTINATION\n"
            "- Greet the caller with a smile in your voice: \"Hello! Welcome to Vihaara Tours and Travels. My name is Mariam. Where are you planning to travel next?\"\n"
            "- Wait for their response. Validate their destination choice with excitement (e.g., \"Oh, great choice!\").\n\n"
            "## STATE 2: THE STEP-BY-STEP VACATION DIAGNOSIS (ASK ONE BY ONE)\n\n"
            "- BEAT 1 (Destination): \"Where are you planning to travel next?\" -> Wait for response.\n"
            "- BEAT 2 (Dates): \"Great! And what month or specific dates are you looking to check in?\" -> Wait for response.\n"
            "- BEAT 3 (People): \"Perfect. How many people will be traveling in total?\" -> Wait for response.\n"
            "- BEAT 4 (Budget): \"Got it. What is your approximate budget per person for the trip?\" -> Wait for response.\n"
            "- BEAT 5 (Meals): \"Understood. For meals, do you prefer vegetarian or non-vegetarian options?\" -> Wait for response.\n"
            "- BEAT 6 (Vehicle): \"And would you like a private vehicle or cab included for local sightseeing?\" -> Wait for response.\n"
            "- BEAT 7 (Custom Vibe): \"Perfect. Any special custom requirements, like a beach-view room or a candle-lit dinner?\" -> Wait for response.\n\n"
            "## STATE 3: THE PROCESS EXPLANATION (BUILDING TRUST)\n"
            "- Once all 7 points are collected, explain how their plan is made so they feel included.\n"
            "- Say: \"Awesome, I've noted down all the details. Our destination team will now filter the best hotels and local experiences based on your vibe and budget to make sure your trip is completely hassle-free.\"\n\n"
            "## STATE 4: THE 24-HOUR CLOSE\n"
            "- Deliver the final close seamlessly.\n"
            "- Say: \"I will personally make sure the best options are selected. Within the next twenty-four hours, I'll send over a complete day-by-day itinerary and final pricing directly to your WhatsApp. Sounds good?\"\n"
            "- Wait for their confirmation, wish them a great day, and sign off warmly."
        )
    )

    context = LLMContext()
    user_aggregator, assistant_aggregator = LLMContextAggregatorPair(context, realtime_service_mode=True)

    pipeline = Pipeline(
        [
            transport.input(),
            user_aggregator,
            llm,
            transport.output(),
            assistant_aggregator,
        ]
    )

    worker = PipelineWorker(
        pipeline,
        params=PipelineParams(
            enable_metrics=True,
            enable_usage_metrics=True,
        ),
        observers=[],
    )

    @transport.event_handler("on_client_connected")
    async def on_client_connected(transport, client):
        logger.info("Client connected")
        context.add_message({
            "role": "user",
            "content": (
                "Say this exact phrase: 'Hello! Welcome to Vihaara Tours and Travels. My name is Mariam. Where are you planning to travel next?'"
            )
        })
        await worker.queue_frames([LLMRunFrame()])

    @transport.event_handler("on_client_disconnected")
    async def on_client_disconnected(transport, client):
        logger.info("Client disconnected")
        await worker.cancel()

    runner = WorkerRunner(handle_sigint=False)
    await runner.add_workers(worker)
    await runner.run()


async def bot(runner_args: RunnerArguments):
    transport_params = {
        "webrtc": lambda: TransportParams(
            audio_in_enabled=True,
            audio_out_enabled=True,
        ),
    }

    transport = await create_transport(runner_args, transport_params)
    await run_bot(transport, runner_args)


if __name__ == "__main__":
    from pipecat.runner.run import main
    main()
