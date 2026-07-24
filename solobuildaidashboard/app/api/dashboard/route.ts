import { NextResponse } from "next/server";
import { GET as getCampaigns } from "@/app/api/campaigns/route";
import { GET as getAgents } from "@/app/api/agents/route";
import { GET as getCalls } from "@/app/api/call/route";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    // We pass the same request to the imported handlers.
    // Since these are GET requests, they only read headers and do not consume a body stream.
    const [campaignsRes, agentsRes, callsRes] = await Promise.all([
      getCampaigns(req),
      getAgents(req),
      getCalls(req)
    ]);

    // Check if any returned 401 Unauthorized
    if (campaignsRes.status === 401 || agentsRes.status === 401 || callsRes.status === 401) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const campaigns = await campaignsRes.json();
    const agents = await agentsRes.json();
    const callLogs = await callsRes.json();
    
    const totalCallsCount = Number(callsRes.headers.get("x-total-count")) || (Array.isArray(callLogs) ? callLogs.length : 0);
    const completedCallsCount = Number(callsRes.headers.get("x-completed-count")) || (Array.isArray(callLogs) ? callLogs.filter((l: any) => l.status === "Completed").length : 0);

    return NextResponse.json({
      campaigns: campaigns.error ? [] : campaigns,
      agents: agents.error ? [] : agents,
      callLogs: callLogs.error ? [] : callLogs,
      totalCallsCount,
      completedCallsCount
    });
  } catch (error: any) {
    console.error("Dashboard aggregated fetch error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
