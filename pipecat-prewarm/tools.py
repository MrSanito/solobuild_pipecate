from loguru import logger
from pipecat.adapters.schemas.function_schema import FunctionSchema
from pipecat.services.llm_service import FunctionCallParams

async def get_cyberarcmsp_info(params: FunctionCallParams) -> None:
    query = params.arguments.get("query", "").lower()
    logger.info(f"get_cyberarcmsp_info tool called with query: {query}")
    
    result = {
        "company": "CyberArcMSP (cyberarcmsp.com)",
        "offerings": "Cybersecurity & Compliance (SOC 2, ISO 27001), Cloud & DevSecOps (Multi-cloud, FinOps), AI & Automation, vCISO advisory.",
        "target": "CEOs, CTOs, CISOs, CIOs, IT Directors."
    }
        
    await params.result_callback(result)

cyberarcmsp_info_tool = FunctionSchema(
    name="get_cyberarcmsp_info",
    description="Get general information about CyberArcMSP.",
    properties={
        "query": {
            "type": "string",
            "description": "The query/topic to search."
        }
    },
    required=["query"],
    handler=get_cyberarcmsp_info
)
