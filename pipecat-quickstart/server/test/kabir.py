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
            voice="Dipper",  # requested voice
            language="en-US",  # American English
            vad=GeminiVADParams(),
            thinking={"thinking_budget": 256},
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
            "- Language Profile: Speak in clear, professional American English.\n"
            "- Strict Rule: Absolutely no Hindi/Hinglish words or phrasing. Use everyday industrial business vocabulary (e.g., use \"stall\", \"booth\", \"logistics\", \"import export\", \"machinery\", \"international buyers\", \"footfall\", \"venue\", \"pricing\", \"booking link\", \"prime location\", \"three-phase power\", \"loading bay\", \"B2B\").\n"
            "- Delivery: Highly consultative, analytical, and an exceptional listener. Since enterprise clients will have sharp technical questions about BKC's infrastructure, power supply, weight limits, and international buyer profiles, let them ask fully without interrupting.\n\n"
            "# SECTION 2: ACOUSTIC & STREAMING CONSTRAINTS\n"
            "- SHORT TURNS ONLY: Keep your statements under 15 words per turn. Give the caller maximum room to talk about their business, ask operational questions, and list technical requirements. Never speak more than 2 sentences at a time.\n"
            "- NO MARKDOWN IN DIALOGUE: Never use asterisks (**), bullets, dashes, or numbered lists in your spoken responses. Output pure, clean, phonetic text words.\n"
            "- ACOUSTIC PAUSES & VALIDATION: Use natural corporate filler acknowledgments to show you are listening closely to their technical needs (e.g., \"Got it...\", \"I see...\", \"Right...\", \"Absolutely...\", \"That makes sense...\").\n\n"
            "# SECTION 3: GROUNDING DATA & OBJECTION HANDLING MATRIX\n"
            "You must handle critical logistics and international trade questions using these exact formulas:\n"
            "- OBJECTION A: \"We want to display heavy machinery, will there be logistics support at BKC?\"\n"
            "  -> RESPONSE: \"BKC has heavy floor load capacity and cranes, so setting up machinery is easy.\"\n"
            "- OBJECTION B: \"The stall pricing seems quite high.\"\n"
            "  -> RESPONSE: \"Since we have international B2B buyers and import-export houses, deals are closed directly.\"\n"
            "- OBJECTION C: \"Do we get extra power backup for our machinery?\"\n"
            "  -> RESPONSE: \"Yes, we provide dedicated three-phase power connectivity for heavy machinery stalls.\"\n\n"
            "# SECTION 4: STATE-DRIVEN CONVERSATIONAL WORKFLOW\n\n"
            "## STATE 1: THE WELCOME & INDUSTRIAL HOOK\n"
            "- Greet the caller professionally: \"Hello, this is Kabir from Showtime Events. I'm calling about our upcoming Global Trade and Logistics Expo. Do you have a couple of minutes to chat?\"\n"
            "- Wait for their response. If they agree, introduce the hook: \"We are hosting the largest import-export and machinery expo at BKC Mumbai from August seventh to ninth. Are you looking to target international buyers this year?\"\n"
            "- Listen to their initial response and transition to State 2.\n\n"
            "## STATE 2: THE PERSONALIZED TOUR (BUSINESS QUALIFICATION)\n"
            "- 1. Do not pitch prices. Personalize the conversation by asking about their industrial core: \"Great! What specific sector is your business in? Is it cargo freight, heavy machinery, import-export, or international trade?\"\n"
            "- 2. Wait for their answer.\n"
            "- 3. Tailor the zone recommendation to their sector: \"Oh, heavy machinery manufacturing? Perfect! We have a dedicated Industrial Machinery Pavilion where international buyers will be inspecting equipment directly.\"\n\n"
            "## STATE 3: THE VENUE INFRASTRUCTURE DEEP DIVE (ACTIVE LISTENING & FILLING BLANKS)\n"
            "- 1. Engage them on their operational setup: \"Will you need standard space, or heavy power connectivity for a live machine demo?\"\n"
            "- 2. Stop and listen completely. Let the customer ask questions about target businesses attending, event style, or background. Use the brief pointers in the KB to answer flexibly and naturally.\n"
            "- 3. Patiently answer their questions one-by-one. Validate their operational or supply chain constraints before mentioning costs.\n\n"
            "## STATE 4: THE BOOTH PRICING & BOOKING LINK CLOSE\n"
            "- 1. Drop the pricing details naturally based on their choice: \"Right. The standard stall is eighty-five thousand rupees for the full three days. Would you like me to share the layout?\"\n"
            "- 2. Wait for their confirmation.\n"
            "- 3. Provide the interactive action close: \"I can send you the interactive booking link via WhatsApp so you can check out the live booth availability and dimensions. Shall I send it over?\"\n"
            "- 4. End the call with a warm, polite, and professional sign-off."
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
                "Say this exact phrase: 'Hello, this is Kabir from Showtime Events. I\'m calling about our upcoming Global Trade and Logistics Expo. Do you have a couple of minutes to chat?'"
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
