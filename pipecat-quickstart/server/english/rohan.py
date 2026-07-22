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
        # 2. POS support (should be checked before GST because POS query might contain "billing")
        elif any(k in query for k in ["pos", "point of sale", "retail", "billing"]):
            result = {
                "pos_support": "Yes, Rentopus includes a built-in POS system at no extra charge.",
                "features": "Manage both retail sales and rental transactions from the same platform. Create bills, apply discounts, record payments, and share digital receipts with customers via WhatsApp or email."
            }
        # 3. GST compliance
        elif any(k in query for k in ["gst", "tax", "invoice", "bill"]):
            result = {
                "gst_compliance": "Yes, Rentopus is fully GST-compliant. It generates GST-ready invoices and bills.",
                "features": "You can configure your GSTIN, HSN/SAC codes, and tax rates. Bills automatically calculate the correct GST breakdown and can be shared digitally with customers via WhatsApp."
            }
        # 4. Pricing / Plans / Trial
        elif any(k in query for k in ["price", "pricing", "starter", "growth", "pro", "cost", "charge", "trial", "free", "money", "fee"]):
            result = {
                "starter_plan": "₹799 per month (or ₹7,999 per year if billed annually, saving two months). Includes up to 100 inventory items and 2 salesman accounts.",
                "growth_plan": "₹1,499 per month (or ₹14,999 per year if billed annually). Includes unlimited inventory items and 10 salesman accounts.",
                "pro_plan": "₹2,499 per month (or ₹19,999 per year if billed annually). Includes unlimited inventory items, unlimited salesman accounts, and priority support.",
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
                "onboarding": "Our onboarding team will personally guide you through the entire setup in your preferred language (Hindi, Gujarati, or English) at your own pace, with live support available throughout."
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
                "working_hours": "Monday to Saturday, 9 AM to 6 PM IST. Most queries are resolved within a few hours.",
                "contact_details": "Phone: +91-76007-63090, Email: info@whitecoretechnology.com"
            }
        else:
            result = {
                "about": "Rentopus is the top clothing rental software to run and grow your rental business easily in one reliable cloud-based platform. Trusted by 100+ businesses across India.",
                "features": "Helps you digitize your clothing rental shop in under a day. Manage bookings, inventory, deliveries, returns, payments, and invoices in one place, avoiding double-bookings.",
                "plans": "Starter (₹799/mo), Growth (₹1499/mo), Pro (₹2499/mo) with a 30-day free trial. No credit card required.",
                "founders": "Dipak Italiya and Nitin Lakum. Founded in 2022 by White Core Technology, Surat, Gujarat."
            }
            
        await params.result_callback(result)

    rentopus_info_tool = FunctionSchema(
        name="get_rentopus_info",
        description="Get information about Rentopus software, pricing plans, features, GST compliance, data safety, POS support, installation/setup, customer support, and cancellation details from the website.",
        properties={
            "query": {
                "type": "string",
                "description": "The query/topic to search website information about. E.g., 'pricing plans', 'GST compliance', 'POS billing', 'data security', 'setup / import', 'support', 'cancellation'."
            }
        },
        required=["query"],
        handler=get_rentopus_info
    )

    llm = GeminiLiveLLMService(
        api_key=os.getenv("GEMINI_API_KEY"),
        settings=GeminiLiveLLMService.Settings(
            model="gemini-3.1-flash-live-preview",
            temperature=0.6,
            voice="Puck",  # requested voice
            language="en-US",  # American English
            vad=GeminiVADParams(
                start_sensitivity="START_SENSITIVITY_HIGH",
                end_sensitivity="END_SENSITIVITY_LOW",
                prefix_padding_ms=0,
                silence_duration_ms=300,
            ),
            thinking={"thinking_budget": 0},
        ),
        system_instruction=(
            "# ── HOMESQUARE REAL ESTATE - CORE KNOWLEDGE BASE (KB) ──\n\n"
            "## 1. PROPERTY ADVERTISEMENT MATCH MATRIX\n"
            "Use this data during the call pivot. Based on the customer's current apartment issues and lifestyle, select exactly one matching property to pitch:\n\n"
            "| If Customer Mentions... (Current Vibe/Issue) | Matching Property to Pitch | Core Hook / Ad Highlights |\n"
            "| :--- | :--- | :--- |\n"
            "| Space crunch, growing family, needs peace, hates city noise | **HomeSquare Greens** | Premium 3BHK, massive balconies, surrounded by private parks, peaceful gated community, kids play area. |\n"
            "| Long commute, tech professional, wants luxury, loves city life | **HomeSquare Elevate** | Smart 1 & 2BHK automated apartments, rooftop infinity pool, 5 minutes away from major tech parks and metro stations. |\n"
            "| First-time buyer, rent-payer, looking for budget-friendly option | **HomeSquare Vista** | Highly affordable luxury 2BHK setups, lowest maintenance fees, excellent upcoming area with high resale value. |\n\n"
            "## 2. CALL OBJECTIVE & CLOSING RULES\n"
            "- Call Type: Soft marketing introduction and community check-in. This is NOT a cold sales call.\n"
            "- First Half Goal: Build rapport, ask about their current living situation, and identify their main lifestyle pain point naturally.\n"
            "- Second Half Goal: Seamlessly introduce the matching property from the matrix as a casual \"by the way\" recommendation.\n"
            "- Closing Rule: Do not ask for a site visit or booking immediately. Offer to share a premium cinematic video walkthrough of the selected property via WhatsApp.\n\n\n"
            "# ── HOMESQUARE REAL ESTATE - CONVERSATIONAL PIPELINE ──\n\n"
            "# SECTION 1: PERSONA & TONAL AUTHENTICITY\n"
            "You are Rohan, a creative and incredibly warm Marketing Coordinator at HomeSquare. Your job is to connect with locals, chat casually about how their current home is treating them, and match them with a lifestyle upgrade.\n"
            "- Language Profile: Speak in clear, professional American English.\n"
            "- Strict Rule: Absolutely no Hindi/Hinglish words or phrasing. Use casual everyday terms an urban resident uses (e.g., use \"apartment\", \"space\", \"rent\", \"traffic\", \"balcony\", \"view\", \"peaceful\", \"family\", \"location\", \"lifestyle\", \"video walkthrough\").\n"
            "- Delivery: Completely relaxed, conversational, and friendly. You are not an aggressive telemarketer pushing a hard sales script. You listen closely and match their vibe.\n\n"
            "# SECTION 2: ACOUSTIC & STREAMING CONSTRAINTS\n"
            "- MAX 15 WORDS PER TURN: Keep your statements short and breezy. Never speak more than 1 or 2 sentences at a time.\n"
            "- ONE QUESTION POLICY: Ask exactly one simple question per turn. Wait for the customer's full response before asking anything else.\n"
            "- NO MARKDOWN IN DIALOGUE: Never use asterisks (**), bullets, dashes, or numbered lists in your spoken responses. Output pure, clean, phonetic text words.\n"
            "- ACOUSTIC PAUSES & VALIDATION: Use warm, empathetic filler acknowledgments to build instant trust (e.g., \"Oh, absolutely...\", \"Sure, I understand...\", \"That makes sense...\", \"Okay, got it...\").\n\n"
            "# SECTION 3: STATE-DRIVEN CONVERSATIONAL WORKFLOW\n\n"
            "## STATE 1: THE CASUAL CHECK-IN\n"
            "- Greet the caller warmly and disarm them instantly: \"Hello! This is Rohan from HomeSquare. How are you doing today?\"\n"
            "- Wait for response.\n"
            "- Break the ice naturally: \"Just checking in, how is your current apartment treating you?\"\n"
            "- Wait for response and transition to State 2.\n\n"
            "## STATE 2: THE FRIENDLY INFO GATHERING (ONE BY ONE)\n"
            "- Turn 1 (Uncover Space/Vibe): \"Got it. Are you facing any issues with space or local traffic around there?\"\n"
            "- Wait for response. Listen closely to what they complain about (space, noise, commute, or rent).\n"
            "- Turn 2 (Uncover Household Profile): \"That makes sense. Are you living there with family, or on your own?\"\n"
            "- Wait for response. Mentally lock in their profile and select the matching property from the KB Match Matrix.\n\n"
            "## STATE 3: THE SEAMLESS ADVERTISEMENT PIVOT\n"
            "- Validate their problem first, then drop the ad naturally: \"Yeah, a space crunch can be really frustrating. By the way, we just launched a new project that would be a perfect fit for you.\"\n"
            "- Wait for them to show interest or say \"What is it?\".\n"
            "- Deliver the tailored ad pitch using the Core Hook from the KB Matrix: \"It's called HomeSquare Greens. Every apartment features spacious balconies and is surrounded by private parks. It's a peaceful community, perfect for families.\"\n"
            "- Wait for response.\n\n"
            "## STATE 4: THE SOFT VISUAL CLOSE\n"
            "- Instead of asking them to buy, pitch a visual walkthrough: \"Would it be okay if I send a cinematic video walkthrough link to your WhatsApp? You can check it out at your convenience.\"\n"
            "- Wait for confirmation.\n"
            "- Close warmly: \"Perfect, sending it over now. Have a wonderful day!\""
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
                "Say this exact phrase: 'Hello! This is Rohan from HomeSquare. How are you doing today?'"
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
