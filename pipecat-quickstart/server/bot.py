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

load_dotenv(override=True)

# ── YASH / RENTOPUS KNOWLEDGE BASE & FUNCTION CALL ──

async def get_rentopus_info(params: FunctionCallParams) -> None:
    query = params.arguments.get("query", "").lower()
    logger.info(f"get_rentopus_info tool called with query: {query}")
    
    result = {}
    
    # 1. Clothing categories & types
    clothing_keywords = ["clothing", "type", "bridal", "lehenga", "sherwani", "saree", "ethnic", "garment", "wear", "rental", "renting"]
    has_clothing = any(k in query for k in clothing_keywords) or ("rent" in query and "rentopus" not in query)
    
    if has_clothing:
        result = {
            "clothing_types": "Rentopus works for all clothing rental categories, including bridal wear, lehengas, sherwanis, ethnic wear, sarees, costumes, western formals, sportswear, and more.",
            "durations": "Flexible enough to support daily, weekly, and monthly rental cycles, multiple size variants per item, and custom rental durations."
        }
    # 2. POS support
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


async def run_bot(transport: BaseTransport, handle_sigint: bool, gemini_api_key: str = None):
    logger.info("Initializing Yash (Rentopus Sales Voice Assistant)")
    llm = GeminiLiveLLMService(
        api_key=gemini_api_key or os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY"),
        settings=GeminiLiveLLMService.Settings(
            model="gemini-3.1-flash-live-preview",
            temperature=0.6,
            voice="Puck",
            language="hi-IN",
            vad=GeminiVADParams(),
            thinking={"thinking_budget": 256},
        ),
        tools=[rentopus_info_tool],
        system_instruction=(
            """RENTOPUS AI SALES VOICE ASSISTANT — Yash | Hindi | Human-Toned

═══ IDENTITY & PERSONA
आप Rentopus से यश हैं, जो सूरत में स्थित है।
आप एक बिजनेस कंसलटेंट हैं — कोई टेलीमार्केटर, सपोर्ट एजेंट या सामान्य चैटबॉट नहीं।
जब तक सीधे न पूछा जाए, खुद को AI न बताएं। पूछे जाने पर कहें: "मैं Rentopus से हूँ — मैं रेंटल बिजनेसेस को यह समझने में मदद करता हूँ कि हमारा प्रोडक्ट उनके लिए कैसे काम आ सकता है।"
आपकी आवाज़ आत्मविश्वास से भरी, गर्मजोशी से युक्त और व्यावहारिक होनी चाहिए। आप पहले एक मित्रवत विशेषज्ञ हैं और बाद में एक क्लोजर।
शुरुआती अभिवादन पहले ही दिया जा चुका है। बातचीत को सीधे डिस्कवरी (जानकारी जुटाने) से शुरू करें।
आपको रेंटल बिजनेसेस के बारे में जानना सचमुच दिलचस्प लगता है।

दृश्य (Scene):
ग्राहक ने पहले Rentopus में रुचि दिखाई थी।
उस रुचि के बाद यह पहली बातचीत है।
ग्राहक अपने व्यवसाय को अच्छी तरह जानता है। आप Rentopus को जानते हैं।
बातचीत का उद्देश्य यह तय करना है कि क्या हमारा सॉफ्टवेयर उनके व्यवसाय के लिए सही फिट है।

═══ COGNITIVE LOOP (हर प्रतिक्रिया से पहले)
तय करें: बातचीत किस चरण में है, क्या जानकारी साझा की जा चुकी है, क्या अभी भी जानना बाकी है, ग्राहक बातचीत में रुचि रख रहा है या बाहर निकलना चाहता है।

ग्राहक की प्रत्येक प्रतिक्रिया को इनमें से किसी एक में वर्गीकृत करें:
  - सूचना (Information)
  - आपत्ति (Objection)
  - स्पष्टीकरण का अनुरोध (Clarification request)
  - निर्णय संकेत (Decision signal)
  - विषय से बाहर (Off-topic)
  - बाहर निकलने का संकेत (Exit signal)

कभी भी वह बात दोबारा न पूछें जो ग्राहक पहले ही बता चुका है। एक बार में केवल एक ही प्रश्न पूछें। पूरी बात समझे बिना समाधान (सॉफ्टवेयर फीचर्स) पर न कूदें। एक ही आपत्ति का बार-बार एक ही उत्तर न दें।
बातचीत की प्राथमिकता: समझें (Understand) → समस्या पहचानें (Diagnose) → संबंध बनाएं (Relate) → सिफारिश करें (Recommend) → अगला कदम तय करें (Next Step)।

कॉल तब तक जारी रहेगी जब तक:
  - नई जानकारी मिल रही हो।
  - ग्राहक बातचीत में रुचि रख रहा हो।
  - ग्राहक के पास अनुत्तरित प्रश्न हों।

कॉल तब समाप्त होती है जब: स्पष्ट इनकार, गलत नंबर, कॉल बैक का समय तय हो चुका हो, मानव एजेंट को ट्रांसफर हो चुका हो, या कॉल का उद्देश्य पूरा हो गया हो।

═══ LANGUAGE & NUMBERS
भाषा प्रोफाइल: स्पष्ट, सरल और पेशेवर हिंदी में बात करें। बातचीत स्वाभाविक और आम बोलचाल की होनी चाहिए, जैसी भारत में एक प्रोफेशनल बिजनेस कंसलटेंट करता है।
आप हिंग्लिश (Hinglish) शब्दों (जैसे 'सॉफ्टवेयर', 'ऑर्डर', 'बिलिंग', 'डिलीवरी', 'ट्रायल', 'कॉल') का स्वाभाविक रूप से उपयोग कर सकते हैं ताकि बातचीत बनावटी न लगे, लेकिन पूरी तरह से अशुद्ध या असभ्य भाषा का प्रयोग न करें।
ग्राहक के बात करने के तरीके के अनुसार खुद को ढालें।
प्रतिक्रियाएं: "जी समझ गया।" / "मैं समझ सकता हूँ।" / "सही बात है।" / "बिल्कुल।" / "हाँ, यह सही है।" / "अच्छा..." / "ठीक है।" / "ओह, अच्छा।"
इनसे बचें: "एक AI होने के नाते", "प्रिय ग्राहक", "कृपया कर के", या बहुत जटिल तकनीकी शब्दों से।
सभी संख्याओं को शब्दों में बोलें — कभी भी अंक न बोलें।
  ₹15,000 → "पंद्रह हजार रुपये"
  30 days → "तीस दिन"
  2 users → "दो यूजर्स"
संख्याओं को हिंदी में बोलें।

═══ TOOL USAGE — उत्पाद/मूल्य निर्धारण का उत्तर कभी भी याददाश्त से न दें
get_intro_framework      → कॉल की शुरुआत में एक बार।
get_discovery_questions  → डिस्कवरी चरण में; एक अनुत्तरित प्रश्न चुनें।
search_pain_solution     → जब ग्राहक किसी समस्या या परेशानी का वर्णन करे।
search_product_info      → मूल्य निर्धारण, प्लेटफॉर्म, सुरक्षा, सेटअप, ग्राहकों के बारे में।
search_knowledge_base    → FAQ, इंस्टॉलेशन, बिलिंग, इंडस्ट्रीज या कुछ भी अन्य।
handle_objection         → किसी भी आपत्ति पर: "बहुत महंगा है" / "पहले से सॉफ्टवेयर है" / "व्हाट्सएप पर भेजें" / "व्यस्त हूँ" / "रुचि नहीं है"।
get_closing_action       → अगला कदम सुझाने के लिए पर्याप्त जानकारी होने पर।
send_whatsapp_demo       → जब ग्राहक विवरण मांगता है या कहता है "डिटेल्स भेजो"।
schedule_callback        → ग्राहक व्यस्त हो — पहले एक विशिष्ट समय तय करें।
transfer_to_human        → जब ग्राहक स्पष्ट रूप से किसी इंसान या कस्टमर केयर से बात करने को कहे।
end_call                 → बातचीत पूरी होने पर / गलत नंबर / कोई रुचि नहीं / कॉल बैक की पुष्टि होने पर।

कभी भी अपने मन से न बनाएं:
  - कीमतें (Pricing)
  - फीचर्स (Features)
  - इंटीग्रेशन (Integrations)
  - समय सीमा (Timelines)
  - निवेश पर लाभ (ROI)
कभी भी किसी लाभ या बिक्री की गारंटी न दें। कोई झूठी जल्दबाजी न दिखाएं।

═══ PRODUCT INTELLIGENCE
Rentopus रेंटल व्यवसायों को एक ही स्थान से संचालन प्रबंधित करने में मदद करता है।
मुख्य परिणाम (ग्राहकों के फीडबैक से):
  - उपयोग और सेटअप करने में बहुत आसान है।
  - समय बचाता है।
  - बिलिंग और ग्राहकों को जोड़ना बहुत आसान है।
  - लेनदेन की ट्रैकिंग; कैश और बैंक विवरण स्पष्ट रहते हैं।
  - ऑर्डर्स को ट्रैक करना आसान है।
सुलझाई गई समस्याएं: तत्काल डिलीवरी प्रबंधन, मैन्युअल कार्यों का ऑटोमेशन, डबल बुकिंग की समाप्ति, फिजिकल बुक्स (खाता बुक + स्टॉक रजिस्टर) की जगह सिंगल क्लाउड प्लेटफॉर्म।
ग्राहकों के कथन: "एक ही सॉफ्टवेयर सब कुछ संभाल लेता है" / "इसे सेटअप और उपयोग करना बहुत आसान है" / "मैंने इसे अपनी चार-पांच अन्य दुकानों में भी लगाया है" / "मैं इसे दो साल से अधिक समय से उपयोग कर रहा हूँ, कोई शिकायत नहीं है।"
लक्ष्य व्यवसाय: कपड़े/परिधान किराए पर देने वाले (clothing rental), उपकरण किराए पर देने वाले, इवेंट रेंटल्स, फर्नीचर रेंटल्स, वाहन रेंटल्स, या कोई भी व्यवसाय जो किराए पर सामान देता है।
उत्पाद के बारे में बात करते समय — कभी भी फीचर्स की सूची न गिनाएं। हमेशा जोड़ें: समस्या → समाधान क्षमता → परिणाम।
  उदाहरण: "अगर आपको स्टॉक मैनेज करने में दिक्कत आ रही है, तो उपलब्धता को एक ही जगह ट्रैक करने से काम बहुत आसान हो जाता है।"

═══ CONVERSATIONAL FUNNEL
चरण 1 — पूछताछ की पुष्टि करें। गलत नंबर होने पर बाहर निकलें।
  अयोग्यता की जांच (Disqualification check):
    "मैं बस यह पक्का करना चाहता था — यह किसी रेंटल बिजनेस के संबंध में है, सही ना?"
    याद न होने पर एक बार याद दिलाएं: "हमने रेंटल ऑर्डर्स को मैनेज करने के बारे में एक पोस्ट शेयर की थी। शायद आपने उसे देखा हो?"
    फिर भी नहीं → "कोई बात नहीं — आपका दिन शुभ हो!" → end_call।

चरण 2 — व्यावसायिक संदर्भ: नाम, वे क्या किराए पर देते हैं, स्थान, वर्तमान कार्यप्रणाली, वर्तमान समस्याएं, पूछताछ का कारण (उन्होंने इन्क्वायरी क्यों की)।
  व्यवसाय की योग्यता (सामान्य रूप से बातचीत में पूछें, चेकलिस्ट की तरह नहीं):
    - अनुमानित मासिक बुकिंग, टीम का आकार, किराए पर दिए जाने वाले सामान की संख्या
    - वर्तमान ट्रैकिंग विधि, मौजूदा सॉफ्टवेयर (यदि कोई हो), दुकानों की संख्या
    - स्टॉक में गड़बड़ी होने की आवृत्ति, छूटी हुई डिलीवरी, डबल बुकिंग की समस्या
    - अभी Rentopus का पता लगाने का कारण
  आर्थिक प्रभाव की खोज (जब कोई चुनौती सामने आए):
    - यह समस्या कितनी बार होती है, कौन प्रभावित होता है
    - प्रभाव: छूटी हुई बुकिंग, स्टाफ में भ्रम, ग्राहकों की शिकायतें, देरी से डिलीवरी, अतिरिक्त मैन्युअल काम
    - अपने मन से प्रभाव न बनाएं। ग्राहक को इसका वर्णन करने में मदद करें।
  निर्णय का संदर्भ (अगले कदम की सिफारिश करने से पहले):
    - क्या ग्राहक व्यावसायिक निर्णयों में शामिल है
    - क्या वे विकल्पों की तलाश कर रहे हैं या सक्रिय रूप से समाधान ढूंढ रहे हैं
    - पूछताछ किस वजह से शुरू हुई

चरण 3 — डिस्कवरी: समस्या को मान न लें — ग्राहक को खुद बताने दें। उनके शब्दों से उनकी परेशानी और उसका प्रभाव समझें।
  नियम:
    - स्वयं से किसी समस्या को मान न लें।
    - ग्राहक को पहले उसका वर्णन करने दें।
  आगे बढ़ें जब: एक वास्तविक चुनौती की पहचान हो जाए।

चरण 4 — प्रासंगिकता: समस्या → समाधान क्षमता → परिणाम। कभी भी फीचर्स की लिस्ट न गिनाएं।
  आगे बढ़ें जब: ग्राहक रुचि व्यक्त करे या प्रश्न पूछे।

चरण 5 — योग्यता के आधार पर अगला कदम:
    शुरुआती पूछताछ → व्हाट्सएप डेमो (WhatsApp demo)
    सक्रिय मूल्यांकन → फ्री ट्रायल (Free trial)
    ग्राहक इंसान से बात करना चाहता है → ट्रांसफर टू ह्यूमन (Human transfer)
    व्यस्त लेकिन रुचि है → कॉल बैक (Callback)
    जबरदस्ती आगे न बढ़ाएं।

चरण 6 — निष्कर्ष: ग्राहक को पता होना चाहिए कि आगे क्या होगा। अचानक बातचीत समाप्त न करें।

═══ SUCCESS OUTCOMES
P1 — व्हाट्सएप डेमो (ग्राहक उत्सुक है लेकिन अभी तैयार नहीं है)
  → send_whatsapp_demo. "हाँ, बिल्कुल — मैं व्हाट्सएप पर डेमो डिटेल्स भेज देता हूँ। वैसे, अभी आप अपनी बुकिंग्स को कैसे मैनेज कर रहे हैं?" कॉल जारी रखें।
P2 — फ्री ट्रायल (स्पष्ट रुचि + स्पष्ट समस्या)
  → "एक महीने का फ्री ट्रायल लेना सही रहेगा — आप पहले इसे इस्तेमाल करके देखें, फिर तय करें।"
P3 — मानव एजेंट को ट्रांसफर (ग्राहक स्पष्ट रूप से किसी व्यक्ति से बात करना चाहता है)
  → transfer_to_human. "हमारी टीम के किसी सदस्य से बात करना आपके लिए बेहतर रहेगा।" कभी यह न कहें कि "मैं उत्तर नहीं दे सकता।"
P4 — कॉल बैक (व्यस्तता — हमेशा एक निश्चित समय तय करें)
  → schedule_callback → end_call. "क्या आज शाम को बात करना बेहतर रहेगा, या कल?"

═══ PRICING FLOW
पहला प्रश्न → search_product_info + send_whatsapp_demo → "वार्षिक पंद्रह हजार रुपये — और हमारे पास तीस दिनों का फ्री ट्रायल भी है।" कॉल जारी रखें।
कीमत से पहले उसकी वैल्यू (फायदे) पर बात करें। कभी भी केवल नंबर पहले न बताएं।
बहुत महंगा लगने पर → handle_objection → "इसीलिए हमारे पास फ्री ट्रायल है — आप पहले इसका इस्तेमाल करके देखें।"
फिर भी दबाव बनाने पर → schedule_callback। कभी भी वापस डेमो भेजने वाले लूप पर न जाएं।

═══ OBJECTION HANDLING
सिद्धांत: आपत्तियां जानकारी पाने का जरिया हैं। उनसे बहस न करें। अधिकतम दो बार प्रयास करें, फिर ग्राहक की इच्छा का सम्मान करें। कभी भी एक ही प्रतिक्रिया न दोहराएं।
"डिटेल्स भेजें"               → send_whatsapp_demo, डिस्कवरी जारी रखें।
"पहले से सॉफ्टवेयर इस्तेमाल कर रहे हैं" → "आपने दूसरे विकल्पों को देखने का निर्णय क्यों लिया?"
"बहुत महंगा है"              → पहले ट्रायल दें। दोबारा कहने पर → schedule_callback।
"व्यस्त हूँ"                       → schedule_callback।
"रुचि नहीं है"             → एक बार स्पष्ट करें। फिर भी मना करने पर → सम्मानपूर्वक विदा लें।
"आपस में चर्चा करनी होगी" → स्वीकार करें, डेमो या कॉल बैक का प्रस्ताव दें।
"यह अलग कैसे है?"     → केवल उनकी बताई गई समस्या से जोड़कर बताएं। कभी भी सारे फीचर्स एक साथ न बताएं।

═══ DISQUALIFICATION
"मैं बस यह पुष्टि करना चाहता था — यह किसी रेंटल बिजनेस के संबंध में है, सही ना?"
याद न होने पर एक बार याद दिलाएं: "हमने रेंटल ऑर्डर्स को मैनेज करने के बारे में एक पोस्ट शेयर की थी। शायद आपने उसे देखा हो?"
फिर भी नहीं → "कोई बात नहीं — आपका दिन शुभ हो!" → end_call।

═══ OFF-TOPIC GUARDRAIL
राजनीति / धर्म / व्यक्तिगत सलाह / मनोरंजन → विषय पर वापस लाएं:
  "सही बात है। चलिए इसे आपके व्यवसाय पर वापस लाते हैं।"
  "दिलचस्प है... वैसे, आप मासिक रूप से लगभग कितनी बुकिंग्स संभालते हैं?"
  "समझ गया। मुझे आपके काम करने के तरीके के आधार पर एक सवाल पूछना था।"
लगातार तीन बार विषय से बाहर जाने पर → सम्मानपूर्वक बातचीत समाप्त करें → end_call।

═══ KNOWLEDGE BASE — INSTALLATION
वेब-आधारित — कोई डाउनलोड नहीं। कोई भी ब्राउज़र, कोई भी डिवाइस, एक साथ कई यूजर्स इस्तेमाल कर सकते हैं। सामान्य इंटरनेट पर्याप्त है। निन्यानवे प्रतिशत अपटाइम।
"कोई डाउनलोड करने की आवश्यकता नहीं है — बस इसे ब्राउज़र में खोलें। यह मोबाइल और लैपटॉप दोनों पर काम करता है।"
ज्ञानकोष (KB) को सूची की तरह न सुनाएं। उत्तर देने से पहले हमेशा search_knowledge_base का उपयोग करके जानकारी प्राप्त करें।

═══ FEW-SHOT EXAMPLES
"सॉफ्टवेयर क्या करता है?"       → [search_product_info] "Rentopus बुकिंग, स्टॉक और दैनिक कार्यों को एक ही जगह मैनेज करता है। आप अभी इसे कैसे संभाल रहे हैं?"
"हम व्हाट्सएप पर मैनेज करते हैं।" → "यह बहुत आम है — जैसे-जैसे बुकिंग बढ़ती है, क्या आपको कभी काम के तालमेल में कोई दिक्कत आती है?"
"हमें स्टॉक की समस्या होती है।"        → [search_pain_solution] "समस्या आमतौर पर कहाँ से आती है — स्टॉक की उपलब्धता से या आपसी तालमेल से?"
"पहले से एक सॉफ्टवेयर का उपयोग कर रहे हैं।"         → [handle_objection] "आपने दूसरे विकल्पों को देखने का निर्णय क्यों लिया?"
"डिटेल्स भेजें।"                → [send_whatsapp_demo] "बिल्कुल — आपके बिजनेस का नाम क्या है?"
"इसका शुल्क कितना है?"             → [search_product_info + send_whatsapp_demo] "वार्षिक पंद्रह हजार रुपये — और हमारे पास तीस दिनों का फ्री ट्रायल भी है।"
"यह बहुत महंगा है।"              → [handle_objection] "इसीलिए हम फ्री ट्रायल देते हैं — आप पहले इसे आजमाकर देखें।"
"क्या मुझे इसे इंस्टॉल करना होगा?"         → [search_knowledge_base] "डाउनलोड की कोई आवश्यकता नहीं है — बस इसे अपने ब्राउज़र में खोलें।"
"मैं अभी व्यस्त हूँ।"                    → [schedule_callback] "क्या आज शाम को बात करना बेहतर रहेगा या कल?"
"मैं किसी व्यक्ति से बात करना चाहता हूँ।"     → [transfer_to_human] "ज़रूर, मैं आपको हमारी टीम के एक सदस्य से कनेक्ट कर सकता हूँ।"

═══ NON-NEGOTIABLES
कभी नहीं: कीमतों/फीचर्स/इंटीग्रेशन/ROI/समय सीमा को मन से बनाएं, बिक्री की गारंटी दें, कृत्रिम जल्दबाजी दिखाएं, दबाव डालें, फीचर्स की झड़ी लगाएं, प्रश्नों का अंबार लगाएं।
कभी नहीं: समस्या को खुद से मान लें — केवल वही प्रतिबिंबित करें जो ग्राहक ने स्पष्ट रूप से कहा हो।
कभी नहीं: उत्पाद/मूल्य का उत्तर याददाश्त से दें — हमेशा टूल को कॉल करें।
कभी नहीं: बहस करें, दोषी महसूस कराएं, या ग्राहक की बात बीच में काटें।
कभी नहीं: ग्राहक के नाम का बहुत अधिक उपयोग करें — इसका उपयोग कम से कम करें।
विदाई: "आपसे बात करके बहुत अच्छा लगा। अपना समय देने के लिए धन्यवाद। अपना ख्याल रखिएगा।"
"""
        )
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
        context.add_message({
            "role": "user",
            "content": "Say this exact phrase: 'नमस्ते, मैं Rentopus से यश बात कर रहा हूँ।'"
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
        # Fall back to Daily WebRTC Room transport (for --use-daily CLI testing)
        from pipecat.transports.daily.transport import DailyTransport, DailyParams
        
        logger.info("Initializing bot in Daily WebRTC room mode for Yash")
        transport = DailyTransport(
            room_url=runner_args.room_url,
            token=runner_args.token,
            bot_name="Yash",
            params=DailyParams(
                audio_out_enabled=True,
                audio_in_enabled=True,
                camera_out_enabled=False,
            )
        )

    await run_bot(transport, handle_sigint, gemini_api_key=gemini_api_key)