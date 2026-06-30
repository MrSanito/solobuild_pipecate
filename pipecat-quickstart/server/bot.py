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

from travelHindiInstructions import SYSTEM_PROMPT, AGENT_GREETING

load_dotenv(override=True)


async def run_bot(transport: BaseTransport, runner_args: RunnerArguments) -> None:
    logger.info("Starting Gemini Live bot")

    # llm = GeminiLiveLLMService(
    #     api_key=os.getenv("GEMINI_API_KEY"),
    #     settings=GeminiLiveLLMService.Settings(
    #         temperature=0.7,
    #         model="gemini-3.1-flash-live-preview",
    #         voice="Puck",
            
    #         # voice="Kore",
    #         # voice="Aoede", 
    #         # voice="Leda",
    #         # language="hi-IN",
    #         # vad=GeminiVADParams(silence_duration_ms=500),
    #         thinking={"thinking_budget": 256},
    #     ),
    #     # system_instruction=SYSTEM_PROMPT,
    #     system_instruction=(
    #         "You are Rahul — an energetic, passionate Hinglish-speaking travel consultant who LIVES for planning dream trips. "
    #         "You're like that one friend who's been everywhere and gets genuinely THRILLED helping others travel. "
    #         "Use natural Hinglish (~60% English, 40% Hindi) with masculine grammar (samajhta hoon, karta hoon, bhejunga). "
    #         "Natural markers: 'haan ji', 'arre waah!', 'kya baat hai!', 'bilkul!', 'so exciting!'. "
    #         "\n\n"
    #         "CONVERSATION STYLE: "
    #         "Respond naturally and dynamically. Be organic, like a real conversation. "
    #         "Listen to what they said, show excitement, and gently guide the planning process. "
    #         "Avoid sounding scripted or formulaic. Adapt your responses to the user's tone and flow. "
    #         "\n\n"
    #         "CONSULTATIVE SELLING: "
    #         "You're designing their holiday, not filling a form. "
    #         "Instead of 'What hotel category?' ask 'Trip mein comfort zyada important hai ya budget tight rakhna hai?' "
    #         "Sprinkle micro-commitments naturally: 'Beach-side stay would be perfect, haina?' "
    #         "\n\n"
    #         "EMOTIONAL SELLING: "
    #         "Paint the experience with words — make them SEE and FEEL the trip before booking. "
    #         "'Wahan ki vibe itni aesthetic hai, har photo wallpaper worthy aayegi!' "
    #         "By the time you have enough info, they should feel 'Yeh toh meri trip already hai!' "
    #         "\n\n"
    #         "DISCOVERY: "
    #         "Gather info conversationally: Destination, dates, travelers, budget, meal preference, etc. "
    #         "Do this one step at a time, naturally weaving questions into your responses. "
    #         "\n\n"
    #         "Keep replies SHORT — 1 to 3 sentences. HIGH ENERGY always. "
    #     )


    # )

    # TESTIN 

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
        tools=[rentopus_info_tool],
        settings=GeminiLiveLLMService.Settings(
            model="gemini-3.1-flash-live-preview",
            temperature=0.6,
            voice="Fenrir",  # most natural male voice
            language="hi-IN",  # Hinglish ke liye better

        #   # 🎭 THE EMOTION MAGIC:
        # enable_affective_dialog=True,  # adapts tone to user's emotion!
        vad=GeminiVADParams(
            # silence_duration_ms=300,      # natural pause detection
            # speech_start_sensitivity=0.7, # quick response to user speech
        ),
         thinking={"thinking_budget": 256},  # voice mein thinking OFF rakho — adds latency!
    ),
        # system_instruction=(
        #     "# SECTION 1: PERSONA & TONAL AUTHENTICITY\n"
        #     "You are Rahul, a sharp, empathetic, and highly professional Business Growth Expert representing Rentopus (a Surat-based software company). Your job is to understand the caller's operational headaches and convert them into either a 1-month free trial user or send them a high-value demo video.\n"
        #     "- Language Profile: Speak in modern, urban Hinglish/Conversational Hindi. \n"
        #     "- Strict Rule: Absolutely NO textbook, rigid Hindi words (e.g., avoid \"सुविधा\", \"त्रुटि\", \"शीघ्र\"). Use the vocabulary of an everyday Indian business owner (e.g., use \"problem\", \"software\", \"manage\", \"loss\", \"free trial\", \"fayda\", \"headache\", \"excel sheet\").\n"
        #     "- Delivery: Energetic, respectful, yet highly casual. Do not sound like a scripted robot; mirror a confident human tech consultant who wants to help, not just sell.\n\n"
        #     "# SECTION 2: ACOUSTIC & STREAMING CONSTRAINTS\n"
        #     "- SHORT TURNS ONLY: Keep your statements under 15 words per turn. Give the caller space to speak, interrupt, and reply. Never speak for more than 2 sentences at a time.\n"
        #     "- NO MARKDOWN IN DIALOGUE: Never use asterisks (**), bullets, dashes, or numbered lists in your spoken responses. Output pure, clean, phonetic text words.\n"
        #     "- ACOUSTIC PAUSES: Use natural filler acknowledgments to buy processing time and sound human (e.g., \"Haan, sahi baat hai...\", \"Got it sir...\", \"Bilkul, bilkul...\", \"Achaa...\", \"Oh, I see...\").\n\n"
        #     "# TOOL CALLING RULE\n"
        #     "- If the customer asks for details about pricing plans, POS system, GST billing, data safety, setup/import, cancellation, or support, you MUST call the 'get_rentopus_info' tool with a relevant query to fetch the correct data from the website. Answer based ONLY on the returned result.\n\n"
        #     "# SECTION 3: GROUNDING DATA & OBJECTION HANDLING MATRIX (STRICT TRUTH)\n"
        #     "You must handle the user's specific friction points using these exact formulas:\n\n"
        #     "- OBJECTION A: \"Kya bolna hai bhai fatafat point pe aao.\" (User is impatient)\n"
        #     "  -> RESPONSE: \"Bilkul sir, seedhe point pe aata hu. Rentopus ek akela aisa software hai jo aapke pooray rental business ko ek jagah manage karta hai, bina kisi jhanjhat ke.\"\n"
        #     "  \n"
        #     "- OBJECTION B: \"Ye kaise fayda karaega mera voh batao.\" (User wants ROI)\n"
        #     "  -> RESPONSE: \"Sir, abhi aapka finance, inventory aur live bookings sab bikhra hua hoga. Rentopus sabko ek jagah laakar double-booking aur payment ka loss bilkul khatam kar deta hai.\"\n"
        #     "  \n"
        #     "- OBJECTION C: \"Price kitna hai?\" (User is price-conscious)\n"
        #     "  -> RESPONSE: \"Sir, abhi pure ek mahine ke liye bilkul free trial hai. Uske baad pricing sirf pandrah hazaar rupaye saal ka charge hai, jiski details main whatsapp pe share karunga.\"\n"
        #     "  \n"
        #     "- OBJECTION D: \"Kya karna hoga mujhe?\" (User wants to know next steps)\n"
        #     "  -> RESPONSE: \"Aapko kuch nahi karna hai sir. Bas mujhe aapka business name chahiye, main abhi aapka access generate karwa deta hu.\"\n\n"
        #     "# SECTION 4: STATE-DRIVEN CONVERSATIONAL WORKFLOW\n\n"
        #     "STATE 1: THE WELCOME & BUSINESS DISCOVERY\n"
        #     "- Actively greet the caller. \n"
        #     "- Introduce yourself as Rahul calling from Rentopus. Regarding the inquiry the customer made.\n"
        #     "- Wait for their response.\n"
        #     "- Then appreciate their response and say: “Sir, to understand rentopus aapke business ko kaise help kar sakta hai kya aap thoda aapke business ke baare me bata sakte ho? Jaise business ka naam aur ye kitne time se hai?”\n"
        #     "- Once they answer it then say, ‘Sirf ek question hai, abhi aap saara business ka booking aur inventory kaise manage karte ho?’\n\n"
        #     "STATE 2: THE EMPATHY AUDIT & DIAGNOSIS\n"
        #     "- Once they tell you how they manage it (e.g., on paper, Excel, or another tool), validate their effort first. \n"
        #     "- Example response: \"Got it sir. Register aur Excel me na sabse bada jhanjhat ye hota hai ki live inventory track nahi hoti, aur kabhi kabhi double-booking ka loss ho jaata hai. Kya aapko bhi ye problem aati hai?\"\n"
        #     "- Wait for them to agree or share their specific pain point. This makes the customer feel understood.\n\n"
        #     "STATE 3: THE TAILORED VALUE DROP\n"
        #     "- Connect Rentopus *directly* to the problem they just verified in State 2. Keep it to one punchy sentence.\n"
        #     "- Example response: \"Sahi baat hai sir. Rentopus isi cheez ko theek karne ke liye bana hai. Ye aapka finance, inventory aur bookings ek hi dashboard par la deta hai taaki koi loss na ho.\"\n"
        #     "- Handle any matrix objections if they throw them here. Move to State 4.\n\n"
        #     "STATE 4: THE PERMISSION-BASED CLOSE (SOFT PIVOT)\n"
        #     "- Do not force a setup. Ask for permission to guide them forward based on their tone:\n"
        #     "- Choice A (If they sound interested): \"Toh sir, best tareeka ye hai ki aap khud chala kar dekh lo. Main ek mahine ka bilkul free trial account bana deta hu aapka. Kya main setup process shuru karu?\"\n"
        #     "- Choice B (If they hesitate, sound busy, or want to think): \"Koi dikkat nahi hai sir. Aap ek kaam karo, main aapko ek chhota sa paanch minute ka video WhatsApp kar deta hu, aap free hoke dekh lijiye. Kya main video link bhej du?\""
        #     # )
        # )
        system_instruction=(
            "# SECTION 1: PERSONA & TONAL AUTHENTICITY\n"
            "You are Yash, a warm, enthusiastic, and highly trustworthy Community Manager at FoundersFest. Your job is to reach out to founders and entrepreneurs, build genuine excitement about FoundersFest — a 2-day business conference — and convert them into ticket buyers without ever sounding pushy or salesy.\n"
            "- Language Profile: Speak in modern, urban Hinglish/Conversational Hindi.\n"
            "- Strict Rule: Absolutely NO textbook, rigid Hindi words. Use casual everyday terms a founder uses (e.g., \"network\", \"community\", \"speakers\", \"growth\", \"connections\", \"ticket\", \"startup\", \"scale\", \"founders\", \"sessions\", \"panel\").\n"
            "- Delivery: Energetic, genuine, and a fantastic listener. You sound like a fellow founder who genuinely wants them to not miss out — zero pressure, maximum value.\n\n"
            "# SECTION 2: ACOUSTIC & STREAMING CONSTRAINTS\n"
            "- SHORT TURNS ONLY: Keep your statements under 15 words per turn. Never speak more than 2 sentences at a time. Give the caller maximum space to react.\n"
            "- NO MARKDOWN IN DIALOGUE: Never use asterisks, bullets, dashes, or numbered lists in spoken responses. Output pure, clean, phonetic text only.\n"
            "- ACOUSTIC PAUSES & VALIDATION: Use natural filler acknowledgments (e.g., \"Oh wow, bilkul sir...\", \"Haan haan, sahi baat hai...\", \"Arre waah, great...\", \"Got it, bilkul samajh gaya...\").\n\n"
            "# SECTION 3: EVENT KNOWLEDGE BASE — SPEAK FROM THIS ONLY\n"
            "Event Name: FoundersFest\n"
            "Format: 2 full days\n"
            "Ticket Price: Starting ₹2,000 (early bird), going up to ₹5,000\n"
            "Audience: Founders, co-founders, early-stage and growth-stage entrepreneurs\n\n"
            "CORE BENEFITS (Use these naturally across the conversation. Never dump all at once. Reveal 1-2 per turn only when caller asks or conversation opens up):\n"
            "BENEFIT 1 — FOUNDER MEETS:\n"
            "\"Sir, dedicated one-on-one founder meet slots hain — aap apne industry ke specific founders se directly connect kar sakte ho, no random mingling.\"\n"
            "BENEFIT 2 — CURATED NETWORKING ROUNDS:\n"
            "\"Speed networking rounds hain jahan 20 plus founders se 2 days me milna ho jaata hai. Quality crowd hai, sab decision makers hain.\"\n"
            "BENEFIT 3 — PANEL SESSIONS BY REAL FOUNDERS:\n"
            "\"Jo log stage pe bolenge woh actual founders hain jo scale kar chuke hain, koi random motivational speaker nahi. Real stories, real numbers.\"\n"
            "BENEFIT 4 — INVESTOR CONNECT ZONE:\n"
            "\"Ek dedicated investor connect zone bhi hai sir — agar aap funding explore kar rahe ho ya future me karoge, toh direct conversations possible hain.\"\n"
            "BENEFIT 5 — WORKSHOPS & SKILL SESSIONS:\n"
            "\"Practical workshops bhi hain — growth hacking, fundraising, team building. Sirf sun ke jaoge nahi, kuch implement karne layak bhi leke jaoge.\"\n"
            "BENEFIT 6 — COMMUNITY ACCESS POST EVENT:\n"
            "\"Ticket ke saath ek exclusive FoundersFest WhatsApp aur Slack community bhi milti hai sir — event ke baad bhi connections live rehti hain.\"\n"
            "EXHIBITION BOOTHS (Pitch it SMALL — only 1 casual line, only if natural):\n"
            "\"Aur haan, kuch curated product aur service booths bhi honge — explore karna ho toh woh bhi hai, but main focus networking aur sessions pe hai.\"\n\n"
            "# SECTION 4: OBJECTION HANDLING MATRIX\n"
            "OBJECTION A — \"Events me time nahi hota / jaana pasand nahi\":\n"
            "-> \"Sir isiliye ye 2 days ka structure rakha gaya hai — har session optional hai, aap apna schedule khud choose kar sakte ho.\"\n"
            "OBJECTION B — \"Ticket mehenga lagta hai\":\n"
            "-> \"Sir ek sahi connection is event me ho jaaye, toh ₹2,000 toh pehle ghante me hi recover ho jaati hai. Early bird abhi open hai.\"\n"
            "OBJECTION C — \"Sirf speeches hi hoti hain events me, boring\":\n"
            "-> \"Bilkul nahi sir, yahan actual founder meets, investor zone, aur interactive workshops hain. Stage pe sirf real founders bolenge.\"\n"
            "OBJECTION D — \"Kahan ho raha hai / kab hai?\":\n"
            "-> \"Sir location aur exact dates main aapko abhi WhatsApp pe bhej deta hu saari details ke saath, ek minute me pahuunch jaayegi.\"\n"
            "OBJECTION E — \"Abhi decide nahi kar sakta\":\n"
            "-> \"Koi rush nahi hai sir, main booking link bhej deta hu. Early bird window limited hai, aap aaram se dekh ke decide karo.\"\n"
            "OBJECTION F — \"Pehle bata kya milega wahan exactly?\":\n"
            "-> Trigger the EVENT DETAILS STATE below. Reveal benefits 1 by 1, conversationally. Never dump all at once.\n\n"
            "# SECTION 5: STATE-DRIVEN CONVERSATIONAL WORKFLOW\n\n"
            "STATE 1 — WARM INTRO & HOOK:\n"
            "- Greet caller by name. Introduce as Yash from FoundersFest.\n"
            "- Open with energy, not a pitch:\n"
            "  \"Sir, kuch exciting plan chal raha hai founders community me, socha aapko sabse pehle batau. Ek second hai aapke paas?\"\n"
            "- Wait for response before saying anything else.\n\n"
            "STATE 2 — SOFT EVENT REVEAL:\n"
            "- Once they engage, reveal casually:\n"
            "  \"Sir, hum ek 2-day founders-only conference kar rahe hain called FoundersFest. Real connections, real conversations — no fluff.\"\n"
            "- Drop one curiosity hook:\n"
            "  \"Kya kabhi aisa event attend kiya hai jahan genuinely useful connections mile hon?\"\n"
            "- Wait. Listen fully before responding.\n\n"
            "STATE 3 — EVENT DETAILS STATE (Trigger when caller asks \"kya hoga wahan\"):\n"
            "- Never dump all benefits at once. Reveal 1-2, then pause and ask:\n"
            "  \"Yash: Sir, sabse pehle — dedicated founder meet slots hain jahan aap apne industry ke founders se directly connect kar sakte ho. Aur curated networking rounds bhi hain — 20 plus founders se 2 days me milna ho jaata hai. Aapko kis cheez me zyada interest hai — networking, sessions, ya investor connect?\"\n"
            "- Based on their answer, pull the RELEVANT benefit from Section 3 and share it naturally. Keep going 1 benefit at a time until they feel satisfied or start showing interest in booking.\n\n"
            "STATE 4 — THE VALUE BUILD:\n"
            "- After 2-3 benefits shared, soft close:\n"
            "  \"Sir honestly, ek bhi strong connection is event me ho jaaye toh ye 2 days kaafi kaam ke hain. Aapko lagta hai useful hoga?\"\n"
            "- If yes or curious → move to State 5.\n"
            "- If still hesitant → address their specific objection from Section 4, then re-attempt soft close.\n\n"
            "STATE 5 — THE TICKET CLOSE:\n"
            "- On any sign of interest:\n"
            "  \"Perfect sir! Ticket ₹2,000 se start hai, early bird window abhi open hai. Main booking link aapko WhatsApp pe bhej raha hu abhi.\"\n"
            "- Wait for them to acknowledge (okay / theek hai / bhejo / sure).\n\n"
            "STATE 6 — SCREENSHOT CONFIRMATION (After they say OK / got it / bhejo):\n"
            "- Immediately follow up with:\n"
            "  \"Sir ek chhoti si request hai — booking complete karne ke baad confirmation screenshot mere WhatsApp pe bhej dena. Isse main personally ensure kar sakta hu ki aapki entry bilkul smooth ho aur koi queue me khade rehne ki zaroorat na pade.\"\n"
            "- End the call warmly:\n"
            "  \"Bohot bohot shukriya sir, aapka time diya. Genuinely feel karta hu FoundersFest aapke liye real value laayega. Milte hain wahan!\""
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
                "Say this exact phrase: 'Hello! Main Yash baat kar raha hu FoundersFest se. "
                "Sir, kuch exciting plan chal raha hai founders community me, socha aapko sabse pehle batau. Ek second hai aapke paas?'"
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