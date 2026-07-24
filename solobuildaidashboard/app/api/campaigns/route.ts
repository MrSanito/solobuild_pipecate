import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Campaign, Agent } from "@/lib/models";
import { getAuthClient } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const { client, isAuthenticated } = await getAuthClient(req);
    if (!isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!client) {
      return NextResponse.json([]);
    }

    const campaigns = await Campaign.find({ clientId: client._id })
      .populate('agentId')
      .sort({ createdAt: -1 });

    const formattedCampaigns = campaigns.map((c: any) => {
      return {
        id: c._id.toString(),
        name: c.name,
        assignedAgent: c.agentId?.name || "Unknown Agent",
        purpose: c.goal || "Lead Qualification",
        description: c.goal || "",
        startDate: c.createdAt.toISOString().split("T")[0],
        endDate: c.createdAt.toISOString().split("T")[0], // Mocking endDate for now
        status: c.status === "active" ? "Active" : c.status === "draft" ? "Scheduled" : c.status === "completed" ? "Completed" : "Paused",
        stats: {
          totalCalls: c.contacts ? c.contacts.length : 0,
          connected: c.contacts ? c.contacts.filter((ct: any) => ct.status === 'contacted' || ct.status === 'completed').length : 0,
          failed: c.contacts ? c.contacts.filter((ct: any) => ct.status === 'failed' || ct.status === 'do_not_call').length : 0,
          successRate: c.stats?.successRate || 0,
        }
      };
    });

    return NextResponse.json(formattedCampaigns);
  } catch (error: any) {
    console.error("Error fetching campaigns:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { client, isAuthenticated } = await getAuthClient(req);
    if (!isAuthenticated || !client) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, assignedAgent, purpose, description, status, leads } = body;

    if (!name || !assignedAgent) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Find agent by name and client (in real app, frontend should send agentId)
    let agent = await Agent.findOne({ name: assignedAgent, clientId: client._id });
    if (!agent) {
      return NextResponse.json({ error: `Agent ${assignedAgent} not found` }, { status: 400 });
    }

    // Map leads to contacts
    const contacts = leads ? leads.map((l: any) => ({
      name: l.customerName,
      number: l.phoneNumber,
      detail: l.company || "",
      notes: l.notes ? [{ text: l.notes, addedBy: client._id }] : [],
      status: 'new'
    })) : [];

    const campaignStatusMap: any = {
      "Active": "active",
      "Scheduled": "draft",
      "Paused": "paused",
      "Completed": "completed"
    };

    const newCampaign = await Campaign.create({
      clientId: client._id,
      name,
      goal: description || purpose,
      status: campaignStatusMap[status] || "draft",
      agentId: agent._id,
      contacts
    });

    return NextResponse.json({ success: true, campaignId: newCampaign._id.toString() });
  } catch (error: any) {
    console.error("Error creating campaign:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
