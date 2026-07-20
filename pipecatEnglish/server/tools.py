from loguru import logger
from pipecat.adapters.schemas.function_schema import FunctionSchema
from pipecat.services.llm_service import FunctionCallParams

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
