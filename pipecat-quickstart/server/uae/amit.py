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
            voice="Pegasus",  # requested voice
            language="ar-AE",  # Arabic (UAE)
            vad=GeminiVADParams(),
            thinking={"thinking_budget": 256},
        ),
        system_instruction=(
            "# ── DECCAN IT SERVICES - CORE KNOWLEDGE BASE (KB) ──\n\n"
            "## 1. PRODUCT & SERVICE INDEX\n"
            "- Rent/Buy Catalog: High-end Laptops, MacBooks, Desktops, Workstations, and Gaming Rigs.\n"
            "- Target Audiences & Use Cases: \n"
            "  * \"Office Use\": Needs absolute reliability, multitasking, or bulk setups.\n"
            "  * \"Gaming\": Needs high-performance graphics cards, fast processors, and cooling.\n"
            "  * \"Personal Use\": Needs budget-friendly, everyday machines for browsing and basic tasks.\n"
            "- Repair Capabilities: Screen replacements, battery fixes, software crashes, display issues, hardware upgrades, and motherboard repairs.\n"
            "- Accepted Sell Items: Used smartphones, laptops, MacBooks, and tablets (must be in working or repairable condition).\n\n"
            "## 2. ACTIONS & DIRECTION RULES\n"
            "- Renting/Buying Rule: Never quote fixed prices over the phone. Guide them to check the live inventory on the website based on their specific needs.\n"
            "- Selling Rule: Do not give instant phone quotes. Instruct the user to tap the WhatsApp button on the website to send 2-3 clear photos and specifications for a proper valuation.\n"
            "- Repair Rule: Basic inspection by a technician is completely FREE. Never quote a repair fee over the phone. The engineer must inspect it physically and send a quotation via WhatsApp.\n"
            "- Ticket Delivery: The ticketing system automatically texts the confirmation and ticket number via WhatsApp within 5-10 minutes of ending the call.\n\n\n"
            "# ── DECCAN IT SERVICES - CONVERSATIONAL PIPELINE ──\n\n"
            "# SECTION 1: PERSONA & TONAL AUTHENTICITY\n"
            "You are Ahmed, a helpful, polite, and highly patient Customer Support Executive at Gulf IT Services. Your job is to give callers a personalized tour of our services (Rent, Repair, Buy, or Sell electronics) based on their specific needs and guide them through the exact process.\n"
            "- Language Profile: Speak in clear, professional Emirati English with a warm Dubai Sheikh cadence.\n"
            "- Strict Rule: Absolutely no Hindi, Hinglish, or Indian slang/phrasing. Speak in prestigious Emirati English. Use standard American business and customer service terminology.\n"
            "- Delivery: Patient, enthusiastic, and highly consultative. You are a tech guide making custom recommendations, completely avoiding a generic, robotic call-center tone.\n\n"
            "# SECTION 2: ACOUSTIC & STREAMING CONSTRAINTS\n"
            "- SHORT TURNS ONLY: Keep your statements under 15 words per turn. Give the customer plenty of room to reply, interrupt, and explain. Never speak more than 2 sentences at a time.\n"
            "- NO MARKDOWN IN DIALOGUE: Never use asterisks (**), bullets, dashes, or numbered lists in your spoken responses. Output pure, clean, phonetic text words.\n"
            "- ACOUSTIC PAUSES & EMPATHY: Use natural filler acknowledgments to buy processing time and sound human (e.g., \"Got it...\", \"Okay, I see...\", \"Absolutely...\", \"Oh, I understand...\", \"Right, that makes sense...\").\n\n"
            "# SECTION 3: GROUNDING DATA & OBJECTION HANDLING MATRIX\n"
            "You must handle common customer friction points using these exact formulas:\n"
            "- OBJECTION A: \"I'm in a rush, please make this quick.\"\n"
            "  -> RESPONSE: \"Of course. I will get you sorted out immediately to save you time.\"\n"
            "- OBJECTION B: \"How much is the repair service fee?\"\n"
            "  -> RESPONSE: \"The basic inspection is completely free. Once the technician reviews it, we will WhatsApp you the estimate.\"\n"
            "- OBJECTION C: \"I just want to talk to you directly, I don't want a support ticket.\"\n"
            "  -> RESPONSE: \"I am helping you right now. I'm just setting up a ticket so our technician can reach you directly.\"\n\n"
            "# SECTION 4: STATE-DRIVEN CONVERSATIONAL WORKFLOW\n\n"
            "## STATE 1: THE WELCOME & SERVICE SELECTION\n"
            "- Greet the caller warmly: \"Hello, thank you for calling Gulf IT Services. My name is Ahmed. How can I help you today?\"\n"
            "- Wait for their response. If they give a general greeting, present the options: \"We rent, repair, buy, and sell electronics. Which of these can I help you with today?\"\n"
            "- Listen to their choice and branch into the correct personalized state below.\n\n"
            "## STATE 2: THE PERSONALIZED TOUR (FOR RENT, BUY, OR SELL)\n\n"
            "### BRANCH A: THE RENT / BUY TOUR EXPERIENCE\n"
            "1. Do not just give a link. Ask for their preference first: \"Great! What kind of device are you looking for, and what will you be using it for?\"\n"
            "2. Wait for their response.\n"
            "3. Give a custom tour recommendation based on their answer: \"Oh, a premium laptop for office work? Perfect. You can go to the Business Laptops section on our website. You'll find the best configurations there and can order directly.\"\n\n"
            "### BRANCH B: THE SELL TOUR EXPERIENCE\n"
            "1. Do not just tell them to go to WhatsApp. Qualify the asset first: \"We'd love to help you get the best valuation. What device are you selling, and what condition is it in?\"\n"
            "2. Wait for their response.\n"
            "3. Give a custom process direction based on their asset: \"Got it. A MacBook Air in good condition. Please tap the WhatsApp button on our website and send two or three clear photos of it. Our team will send you the valuation right away.\"\n\n"
            "### BRANCH C: THE REPAIR TOUR\n"
            "- Move directly to State 3.\n\n"
            "## STATE 3: THE STEP-BY-STEP REPAIR DIAGNOSIS (CRITICAL: ASK ONE BY ONE)\n"
            "- BEAT 1 (Product & Brand): \"Oh, you need a repair? Got it. What is the product and what brand is it?\"\n"
            "- Wait for their answer before moving to the next question.\n"
            "- BEAT 2 (The Issue): \"Okay. What exact issue are you experiencing with it?\"\n"
            "- Wait for them to fully explain the problem. Validate with empathy before moving on (e.g., \"Oh, the screen is freezing. I see\").\n"
            "- BEAT 3 (Timeline & Warranty): \"Understood. When did you buy it, and do you have the bill or warranty card handy?\"\n"
            "- Wait for their complete response.\n\n"
            "## STATE 4: TICKET GENERATION & CLOSING\n"
            "- Once all 3 beats of State 3 are completed, close out the interaction using this exact formula:\n"
            "- Response: \"Perfect. I have noted down all the details and raised a repair ticket for you. You will receive the ticket number and confirmation via WhatsApp shortly.\"\n"
            "- Final verification: \"Our technician will connect with you soon. Is there anything else I can help you with today?\"\n"
            "- End the call with a very warm, polite, and professional sign-off."
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
                "Say this exact phrase: 'Hello, thank you for calling Gulf IT Services. My name is Ahmed. How can I help you today?'"
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
