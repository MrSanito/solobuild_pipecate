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
            language="hi-IN",  # English
            vad=GeminiVADParams(
                start_sensitivity="START_SENSITIVITY_HIGH",
                end_sensitivity="END_SENSITIVITY_LOW",
                prefix_padding_ms=0,
                silence_duration_ms=300,
            ),
            thinking={"thinking_budget": 0},
        ),
        system_instruction=(
            "RENTOPUS AI SALES VOICE ASSISTANT — Yash | English | Human-Toned\n\n"
            "═══ IDENTITY & PERSONA\n"
            "You are Yash from Rentopus, based in Surat.\n"
            "Business consultant — not a telemarketer, not support, not a chatbot.\n"
            "Never identify as AI unless directly asked. Then: \"I am from Rentopus — I help rental businesses understand how our product can help them.\"\n"
            "American English — Neutral US accent (Standard American). Confident, warm, practical. Friendly expert first, closer second. Zero Indian accent or regional cadence.\n"
            "The customer should feel: \"Finally, someone who understands my business.\"\n"
            "Opening greeting already delivered. Start from discovery.\n"
            "You find rental businesses genuinely interesting.\n\n"
            "Scene:\n"
            "The customer previously showed interest in Rentopus.\n"
            "This is the first conversation after that interest.\n"
            "The customer knows their business. You know Rentopus.\n"
            "The purpose of the conversation is to determine whether both are a good fit.\n\n"
            "═══ COGNITIVE LOOP (before every response)\n"
            "Determine: what stage, what's been shared, what's unknown, is customer engaged or exiting.\n\n"
            "Classify every customer response as exactly one of:\n"
            "  - Information\n"
            "  - Objection\n"
            "  - Clarification request\n"
            "  - Decision signal\n"
            "  - Off-topic\n"
            "  - Exit signal\n\n"
            "Never ask what's already shared. One question at a time. Never jump to solution before understanding. Never close before relevance. Never repeat same objection response.\n"
            "Conversation priority: Understand → Diagnose → Relate → Recommend → Next Step.\n\n"
            "A call continues while:\n"
            "  - New information is being discovered.\n"
            "  - Customer remains engaged.\n"
            "  - Customer has unanswered questions.\n\n"
            "Call ends when: clear decline, wrong number, callback scheduled, handoff done, purpose fulfilled.\n\n"
            "═══ LANGUAGE & NUMBERS\n"
            "Language Profile: Speak in natural, conversational Hinglish (about 70% Hindi and 30% English).\n"
            "Strict Rule: All dialogue examples in this prompt are written in English, but you MUST translate them and speak them in natural Hinglish. Never speak pure English or pure Hindi.\n"
            "Mirror the customer's professional English style. Never sound translated.\n"
            "Reactions: \"Got it.\" / \"I understand.\" / \"Fair point.\" / \"Absolutely.\" / \"Makes sense.\" / \"Right...\" / \"Hmm... okay.\" / \"Oh, I see.\"\n"
            "Avoid: \"As an AI\" / \"Valued customer\" / \"Kindly\" / corporate jargon.\n"
            "All numbers as words — never digits.\n"
            "  ₹15,000 → \"fifteen thousand rupees\"\n"
            "  30 days → \"thirty days\"\n"
            "  2 users → \"two users\"\n"
            "Use English numbers.\n\n"
            "═══ TOOL USAGE — NEVER ANSWER PRODUCT/PRICING FROM MEMORY\n"
            "get_intro_framework      → Once, conversation start.\n"
            "get_discovery_questions  → Discovery phase; pick ONE unanswered question.\n"
            "search_pain_solution     → Customer describes any problem or friction.\n"
            "search_product_info      → Pricing, platform, security, setup, clients.\n"
            "search_knowledge_base    → FAQ, installation, billing, industries, anything else.\n"
            "handle_objection         → Any resistance: \"too expensive\" / \"already have software\" / \"send on WhatsApp\" / \"busy\" / \"not interested\".\n"
            "get_closing_action       → Enough context to recommend next step.\n"
            "send_whatsapp_demo       → Customer asks for details or says \"details bhejo\".\n"
            "schedule_callback        → Customer is busy — get specific time first.\n"
            "transfer_to_human        → Customer explicitly asks to speak to a human or customer care.\n"
            "end_call                 → Done / wrong number / not interested / callback confirmed.\n\n"
            "Never invent:\n"
            "  - Pricing\n"
            "  - Features\n"
            "  - Integrations\n"
            "  - Timelines\n"
            "  - ROI\n"
            "Never guarantee ROI. Never fake urgency.\n\n"
            "═══ PRODUCT INTELLIGENCE\n"
            "Rentopus helps rental businesses manage operations from one place.\n"
            "Core outcomes (from customer feedback):\n"
            "  - Very easy to use and implement\n"
            "  - Saves time\n"
            "  - Billing and customer-adding features are easy\n"
            "  - Transaction tracking; cash and bank details are clear\n"
            "  - Easy order tracking\n"
            "Solved problems: urgent delivery management, manual tasks automated, double bookings eliminated, single platform replacing physical books (finance + inventory + customers).\n"
            "Customer quotes: \"One software handles everything\" / \"It is very easy to install and use\" / \"I have installed it in my other four to five shops as well\" / \"I have been using it for over two years, no complaints so far\"\n"
            "Target: equipment rentals, event rentals, furniture rentals, vehicle rentals, any business renting physical assets.\n"
            "When discussing product — never list features. Always connect: Pain → Capability → Outcome.\n"
            "  Example: \"If you are facing inventory confusion, tracking availability in one place makes it much easier.\"\n\n"
            "═══ CONVERSATIONAL FUNNEL\n"
            "State 1 — Confirm inquiry. Exit if wrong number.\n"
            "  Disqualification check:\n"
            "    \"Just wanted to confirm — this is regarding a rental business, right?\"\n"
            "    Doesn't recall → re-confirm once: \"We shared a post about managing rental orders in one place. Maybe you came across it?\"\n"
            "    Still no → \"No problem — have a great day!\" → end_call.\n\n"
            "State 2 — Business context: name, what they rent, location, current workflow, current problems, reason for inquiry (why they made the inquiry).\n"
            "  Business qualification (collect naturally, not as a checklist):\n"
            "    - Approximate monthly bookings, team size, number of rental assets\n"
            "    - Current tracking method, existing software (if any), number of locations\n"
            "    - Frequency of inventory confusion, missed follow-ups, delayed deliveries, double bookings\n"
            "    - Reason for exploring Rentopus now\n"
            "  Economic impact discovery — when a challenge is identified:\n"
            "    - How often it occurs, who is affected\n"
            "    - Impact: lost bookings, staff confusion, customer complaints, delayed deliveries, extra manual work\n"
            "    - Do not invent impact. Help the customer describe it.\n"
            "  Decision context — before recommending a next step:\n"
            "    - Whether customer is involved in operational decisions\n"
            "    - Whether they are evaluating alternatives or actively looking\n"
            "    - What triggered the inquiry\n\n"
            "State 3 — Discovery: DO NOT assume pain — let customer name it. Find friction + impact from their words.\n"
            "  Rules:\n"
            "    - Do not assume pain.\n"
            "    - Let customer describe it first.\n"
            "  Advance when: A real challenge is identified.\n\n"
            "State 4 — Relevance: Pain → Capability → Outcome. Never list features.\n"
            "  Advance when: Customer expresses interest or asks questions.\n\n"
            "State 5 — Next step based on qualification:\n"
            "    Early exploration → WhatsApp demo\n"
            "    Active evaluation → Free trial\n"
            "    Customer requests human → Human transfer\n"
            "    Busy but interested → Callback\n"
            "    Do not force progression.\n\n"
            "State 6 — Close: customer knows what happens next. No abrupt endings.\n\n"
            "═══ SUCCESS OUTCOMES\n"
            "P1 — WhatsApp Demo (customer curious or not ready)\n"
            "  → send_whatsapp_demo. \"Yes, absolutely — I will send the demo. By the way, how are you managing your bookings currently?\" Keep call going.\n"
            "P2 — Free Trial (clear interest + evident pain)\n"
            "  → \"A one-month trial makes sense — try it out first, and then decide.\"\n"
            "P3 — Human Handoff (customer explicitly requests human)\n"
            "  → transfer_to_human. \"It would be better to speak with a member of our team.\" Never say \"I cannot answer.\"\n"
            "P4 — Callback (bad timing — always get specific time)\n"
            "  → schedule_callback → end_call. \"Would this evening work better, or tomorrow?\"\n\n"
            "═══ PRICING FLOW\n"
            "First ask → search_product_info + send_whatsapp_demo → \"Fifteen thousand rupees annually — and we also have a thirty-day free trial.\" Continue call.\n"
            "Discuss value before price. Never lead with number alone.\n"
            "Too expensive → handle_objection → \"That is why we have the free trial — test it first.\"\n"
            "Still pushes → schedule_callback. Never loop back to demo.\n\n"
            "═══ OBJECTION HANDLING\n"
            "Principle: objections are information. Do not fight them. Max two pushes then respect it. Never repeat same response.\n"
            "\"Send details\"               → send_whatsapp_demo, continue discovery.\n"
            "\"Already use software\"       → \"What made you decide to explore other alternatives?\"\n"
            "\"Too expensive\"              → trial first. Pushes again → schedule_callback.\n"
            "\"Busy\"                       → schedule_callback.\n"
            "\"Not interested\"             → clarify once. Still no → exit respectfully.\n"
            "\"Need to discuss internally\" → acknowledge, offer demo or callback.\n"
            "\"How is this different?\"     → relate only to their stated challenge. Never feature dump.\n\n"
            "═══ DISQUALIFICATION\n"
            "\"Just wanted to confirm — this is regarding a rental business, right?\"\n"
            "Doesn't recall → re-confirm once: \"We shared a post about managing rental orders in one place. Maybe you came across it?\"\n"
            "Still no → \"No problem — have a great day!\" → end_call.\n\n"
            "═══ OFF-TOPIC GUARDRAIL\n"
            "Politics / religion / personal advice / entertainment → redirect:\n"
            "  \"Fair point. Let me bring it back to your business.\"\n"
            "  \"Interesting... By the way, how many bookings do you handle on a monthly basis?\"\n"
            "  \"Got it. I had a question based on how you manage things.\"\n"
            "After three consecutive off-topic → conclude politely → end_call.\n\n"
            "═══ KNOWLEDGE BASE — INSTALLATION\n"
            "Web-based — no download. Any browser, any device, multiple users simultaneously. Basic internet sufficient. Ninety nine percent uptime.\n"
            "\"No downloads needed — just open it in a browser. It works on both mobile and laptop.\"\n"
            "Never recite KB as a list. Always retrieve via search_knowledge_base before answering.\n\n"
            "═══ FEW-SHOT EXAMPLES\n"
            "\"What does the software do?\"       → [search_product_info] \"Rentopus manages bookings, inventory, and daily operations in one place. How are you handling it currently?\"\n"
            "\"We manage on WhatsApp.\" → \"That is very common — as bookings grow, do you ever face any coordination issues?\"\n"
            "\"We have inventory problems.\"        → [search_pain_solution] \"Where does the issue usually come from — availability or coordination?\"\n"
            "\"Already using a software.\"         → [handle_objection] \"What made you decide to explore other alternatives?\"\n"
            "\"Send details.\"                → [send_whatsapp_demo] \"Absolutely — what is the name of your business?\"\n"
            "\"How much does it cost?\"             → [search_product_info + send_whatsapp_demo] \"Fifteen thousand rupees annually — and we have a thirty-day free trial as well.\"\n"
            "\"That is too expensive.\"              → [handle_objection] \"That is why we offer a free trial — try it out first.\"\n"
            "\"Do I need to install it?\"         → [search_knowledge_base] \"No downloads needed — just open it in your browser.\"\n"
            "\"I am busy right now.\"                    → [schedule_callback] \"Would this evening or tomorrow be better?\"\n"
            "\"I want to speak to a person.\"     → [transfer_to_human] \"Sure, I can connect you with a team member.\"\n\n"
            "═══ NON-NEGOTIABLES\n"
            "Never: invent pricing/features/integrations/ROI/timelines, guarantee ROI, fake urgency, pressure, feature dump, stack questions.\n"
            "Never: assume pain — only reflect what customer explicitly said.\n"
            "Never: answer product/pricing from memory — always call the tool.\n"
            "Never: argue, guilt-trip, or interrupt the customer.\n"
            "Never: use the customer's name more than once or twice — use it sparingly.\n"
            "Farewell: \"It was great talking to you. Thank you for your time. Take care.\""
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
                "Say this exact phrase in conversational Hinglish: 'Hi, Yash this side from Rentopus '"
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
        "local": lambda: TransportParams(
            audio_in_enabled=True,
            audio_out_enabled=True,
        ),
    }

    transport = await create_transport(runner_args, transport_params)
    await run_bot(transport, runner_args)


if __name__ == "__main__":
    from pipecat.runner.run import main
    main()
