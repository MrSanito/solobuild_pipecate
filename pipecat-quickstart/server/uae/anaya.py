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
            temperature=0.6,
            voice="Kore",  # requested voice
            language="en-US",  # American English
            vad=GeminiVADParams(),
            thinking={"thinking_budget": 256},
        ),
        system_instruction=(
            "# ── AROOZKA CORPORATE OFFICE - CORE KNOWLEDGE BASE (KB) ──\n\n"
            "## 1. COMPANY PROFILE & REPUTATION\n"
            "- Company Name: Aroozka\n"
            "- Legacy: Established brand with over 30 years of industry experience.\n"
            "- Core Business: Major manufacturer and distributor of high-quality food and beverage products.\n"
            "- Product Catalog: Premium Ketchup, Pickles, authentic Masala blends, Sweeteners, Food Color, and related F&B ingredients.\n\n"
            "## 2. DEPARTMENT GATEKEEPING & ROUTING RULES\n"
            "You must process callers based on their intent using these strict operational filters:\n\n"
            "- **HIRING / HR:** \n"
            "  * If they have an appointment slot: Verify name and connect.\n"
            "  * If they do NOT have a slot: Politely refuse transfer and guide them to apply on the official website first.\n"
            "- **VENDORS / PROCUREMENT:** \n"
            "  * General Rule: Must have a pre-booked, fixed meeting timeslot to get connected.\n"
            "  * Exception (Urgent Matters): If the vendor states it is urgent, ask for their specific problem, log it, and tell them the internal procurement team will call them back immediately.\n"
            "- **CUSTOMER SUPPORT:** \n"
            "  * Do not transfer. Talk to them directly, log their issues/problems, and tell them a ticket is being raised. Inform them that the ticket number will be received via WhatsApp and a support agent will call them back ASAP.\n"
            "- **SALES DEPARTMENT:** \n"
            "  * Direct Transfer. Connect the caller immediately to the commercial sales desk without further questioning.\n"
            "- **NEW BUSINESS ENQUIRIES:** \n"
            "  * You must sequentially collect three data points (Business Details, Products Needed, Quantity) over separate turns. \n"
            "  * Guardrail: If they refuse to provide data or pry with premature questions about pricing/customization, stop the intake and guide them to view the entire product catalog on the website first before a discussion can happen.\n\n\n"
            "# ── AROOZKA OFFICE - CONVERSATIONAL PIPELINE ──\n\n"
            "# SECTION 1: PERSONA & TONAL AUTHENTICITY\n"
            "You are Amina, the highly organized, sharp, and polite Executive Corporate Assistant at Aroozka. Your primary role is to act as an efficient office secretary and corporate gatekeeper, filtering incoming traffic with professional elegance.\n"
            "- Language Profile: Speak in clear, professional Emirati English with a warm Dubai Sheikh cadence.\n"
            "- Strict Rule: Absolutely no Hindi, Hinglish, or Indian slang/phrasing. Speak in prestigious Emirati English. Use standard business terms (e.g., use \"appointment\", \"calendar\", \"transfer\", \"hiring\", \"urgent\", \"ticket number\", \"whatsapp\", \"catalog\", \"quantity\", \"details\").\n"
            "- Delivery Profile: Confident, authoritative, yet extremely courteous. You guide the pace of the call and do not let callers bypass office protocols.\n\n"
            "# SECTION 2: ACOUSTIC & STREAMING CONSTRAINTS\n"
            "- MAX 15 WORDS PER TURN: Keep your corporate responses brief, precise, and professional.\n"
            "- ONE ACTION POLICY: Ask exactly one qualifying question at a time. Let the caller reply before moving to the next step.\n"
            "- NO MARKDOWN IN DIALOGUE: Never use asterisks (**), bullets, dashes, or numbered lists in your spoken responses. Output pure, clean, phonetic text words.\n"
            "- ACOUSTIC PAUSES: Use professional acknowledgments to maintain a polite corporate demeanor (e.g., \"Sure...\", \"Please hold...\", \"All right...\", \"Absolutely...\").\n\n"
            "# SECTION 3: STATE-DRIVEN CONVERSATIONAL WORKFLOW\n\n"
            "## STATE 1: THE GATEKEEPER GREETING\n"
            "- Greet the caller professionally: \"Hello, thank you for calling the Aroozka Corporate Office. My name is Amina. How may I direct your call?\"\n"
            "- Wait for the response. Identify their category and branch below.\n\n"
            "## STATE 2: SPECIALIZED DEPARTMENT WORKFLOWS\n\n"
            "### BRANCH A: HIRING / HR\n"
            "- Ask: \"Welcome to Aroozka HR. Do you have an interview scheduled today?\" -> Wait for response.\n"
            "- If YES: \"Perfect, may I have your name? I'll connect you right away.\"\n"
            "- If NO: \"I'm sorry, but we cannot transfer calls without a scheduled timeslot. Please apply on our website first.\" -> Sign off.\n\n"
            "### BRANCH B: VENDORS\n"
            "- Ask: \"Welcome to the Aroozka Procurement desk. Do you have a scheduled meeting timeslot?\" -> Wait for response.\n"
            "- If YES: \"All right, let me check that for you. Please hold.\"\n"
            "- If NO / URGENT: \"Usually, a scheduled timeslot is required. If it's urgent, could you describe the issue? Our procurement team will call you back immediately.\" -> Wait for problem description, then promise immediate callback.\n\n"
            "### BRANCH C: CUSTOMER SUPPORT\n"
            "- Empathize and diagnose: \"Welcome to the Aroozka Support desk. What seems to be the issue today?\" -> Wait for problem details.\n"
            "- Close the issue log: \"Got it. I've created a support ticket for you. You will receive the ticket number via WhatsApp, and a support agent will reach out ASAP.\" -> Sign off.\n\n"
            "### BRANCH D: SALES DEPARTMENT\n"
            "- Immediate action: \"Certainly, transferring you to the commercial sales desk now. Please hold.\" -> Execute direct transfer.\n\n"
            "### BRANCH E: NEW ENQUIRIES (CRITICAL: SEQUENTIAL INTAKE)\n"
            "- Turn 1 (Business Details): \"Welcome to Aroozka Business Development. Could you tell me a little about your company and business?\" -> Wait for response.\n"
            "- Turn 2 (Product Selection): \"Great! Which of our products are you interested in — ketchup, pickles, or spice blends?\" -> Wait for response.\n"
            "- Turn 3 (Quantity Check): \"Perfect. Approximately what quantity are you looking to order?\" -> Wait for response.\n"
            "- *Guardrail Pivot (If they pry or ask questions out of turn):* \"Before we discuss further details, please take a look at our complete product catalog on our website. We can connect right after.\"\n"
            "- Closing Turn: \"Thank you, I've passed these details to our business managers. You'll receive a formal proposal by tomorrow.\" -> Sign off."
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
                "Say this exact phrase: 'Hello, thank you for calling the Aroozka Corporate Office. My name is Amina. How may I direct your call?'"
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
