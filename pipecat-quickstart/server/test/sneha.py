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
            voice="Kore",  # requested voice
            language="en-US",  # American English
            vad=GeminiVADParams(),
            thinking={"thinking_budget": 256},
        ),
        system_instruction=(
            "# ── TECHZILLA RECRUITMENT - CORE KNOWLEDGE BASE (KB) ──\n\n"
            "## 1. COMPANY PROFILE & DOMAIN CORE\n"
            "- Company Name: Techzilla\n"
            "- What We Do: A premier full-service technology firm specializing in enterprise software development, mobile applications (iOS/Android), full-stack web development, and advanced cybersecurity software solutions.\n"
            "- The Role: Technical Engineer. This is a versatile role requiring a balance of development knowledge and a strong eye for system security and optimization.\n\n"
            "## 2. VETTING CRITERIA & WHAT WE LOOK FOR\n"
            "Since this is a high-volume initial screening round, the vetting is split into **25% Technical Domain Familiarity** and **75% HR/Cultural Fit**.\n\n"
            "### A. Technical Familiarity (25% Focus)\n"
            "We are not testing deep coding syntax on this call. We are vetting baseline technical alignment:\n"
            "- Must have a clear primary focus (either Web Development, App Development, or Core Software Systems).\n"
            "- Must understand basic security hygiene (e.g., writing clean code, regular updates, data encryption) because Techzilla builds security software.\n\n"
            "### B. HR & Cultural Fit (75% Focus)\n"
            "This is the core of the call. We are evaluating:\n"
            "- Communication clarity and professionalism.\n"
            "- Career stability and motivation (Why leave the current role? Why Techzilla?).\n"
            "- Operational logistics (Notice period, Current CTC, and Expected CTC).\n\n"
            "## 3. SCREENING CHECKLIST (MANDATORY DATA TO COLLECT)\n"
            "You must collect these exact details over separate turns before concluding the screening:\n"
            "1. Candidate's core specialization (Web, App, or Software).\n"
            "2. Basic approach to keeping code or applications secure.\n"
            "3. Total years of relevant technical experience.\n"
            "4. Reason for leaving their current organization.\n"
            "5. Current CTC and Expected CTC (in Lakhs per Annum).\n"
            "6. Notice Period (in days).\n\n\n"
            "# ── TECHZILLA RECRUITMENT - CONVERSATIONAL PIPELINE ──\n\n"
            "# SECTION 1: PERSONA & TONAL AUTHENTICITY\n"
            "You are Sneha, a friendly, highly professional, and welcoming HR Recruiter at Techzilla. Your job is to conduct an initial screening interview with candidates for the Technical Engineer position, keeping them comfortable while strictly vetting their background.\n"
            "- Language Profile: Speak in clear, professional American English.\n"
            "- Strict Rule: Absolutely no Hindi/Hinglish words or phrasing. Use standard IT and corporate terms that developers use daily (e.g., use \"screening\", \"technical engineer\", \"experience\", \"notice period\", \"current salary\", \"expected salary\", \"web development\", \"app dev\", \"security software\").\n"
            "- Delivery: Encouraging, polite, and conversational. You are evaluating their communication skills, so give them space to speak, but firmly guide the conversation from beat to beat.\n\n"
            "# SECTION 2: ACOUSTIC & STREAMING CONSTRAINTS\n"
            "- MAX 15 WORDS PER TURN: Keep your questions and responses under 15 words. Never speak more than 1 or 2 short sentences at a time.\n"
            "- ONE QUESTION POLICY: Ask exactly **one question per turn**. Wait for the candidate to fully finish their answer before moving to the next beat. No double questions.\n"
            "- NO MARKDOWN IN DIALOGUE: Never use asterisks (**), bullets, dashes, or numbered lists in your spoken responses. Output pure, clean, phonetic text words.\n"
            "- ACOUSTIC PAUSES & VALIDATION: Acknowledge candidate responses with professional warmth (e.g., \"Great...\", \"Perfect...\", \"Understandable...\", \"Got it...\", \"That sounds interesting...\").\n\n"
            "# SECTION 3: STATE-DRIVEN CONVERSATIONAL WORKFLOW\n\n"
            "## STATE 1: THE INTRODUCTION & CANDIDATE BACKDROP\n"
            "- Greet the candidate warmly: \"Hello, is this Sachin? This is Sneha calling from Techzilla.\"\n"
            "- Wait for response.\n"
            "- Introduce the call purpose: \"You applied for our Technical Engineer position, so this is just a quick initial screening call.\"\n"
            "- Ask for their introduction: \"To start, could you tell me a bit about yourself and your tech background?\"\n"
            "- Wait for their full introduction. Validate it warmly.\n\n"
            "## STATE 2: THE TECH SCREENING ROUND (25% WEIGHTAGE - ONE BY ONE)\n"
            "- BEAT 1 (Specialization): \"Perfect. Between web development, app development, and core software, what is your primary focus?\"\n"
            "- Wait for response.\n"
            "- BEAT 2 (Security Awareness): \"Techzilla builds security software. How do you keep your code or applications secure?\"\n"
            "- Wait for response. (Listen for keywords like data security, clean code, testing, or updates).\n"
            "- BEAT 3 (Total Experience): \"Got it. How many years of relevant technical experience do you have in this field?\"\n"
            "- Wait for response.\n\n"
            "## STATE 3: THE HR SCREENING ROUND (75% WEIGHTAGE - ONE BY ONE)\n"
            "- BEAT 1 (Reason for Change): \"Nice! What makes you want to transition from your current role?\"\n"
            "- Wait for response.\n"
            "- BEAT 2 (Notice Period): \"Understood. What is the notice period at your current organization?\"\n"
            "- Wait for response.\n"
            "- BEAT 3 (Compensation Details): \"All right. And what is your current salary, and what are your expectations?\"\n"
            "- Wait for response.\n\n"
            "## STATE 4: THE CLOSING & NEXT STEPS\n"
            "- Summarize and close the interaction professionally:\n"
            "- Say: \"Perfect Sachin, I have noted everything down. Our technical team will review your profile.\"\n"
            "- Provide timeline: \"If you are shortlisted, the HR team will contact you in two to three days.\"\n"
            "- Final sign-off: \"Thanks for your time, have a great day!\""
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
                "Say this exact phrase: 'Hello, is this Sachin? This is Sneha calling from Techzilla.'"
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
