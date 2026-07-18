import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Agent, Client } from "@/lib/models";
import { verifyToken } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    await dbConnect();
    
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.split(" ")[1];
    const decoded = await verifyToken(token);
    
    if (!decoded) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const clientEmail = decoded.email;

    const client = await Client.findOne({ email: clientEmail });
    
    if (!client) {
      return NextResponse.json([]);
    }

    const agents = await Agent.find({ clientId: client._id }).sort({ createdAt: -1 });
    
    // Dynamically import Call and Campaign to fetch stats
    const { Call, Campaign } = require("@/lib/models");

    // Map to frontend expected format
    const formattedAgents = await Promise.all(agents.map(async (a) => {
      // Find campaigns for this agent
      const campaigns = await Campaign.find({ agentId: a._id });
      const campaignIds = campaigns.map((c: any) => c._id);

      // Find calls for these campaigns
      const calls = await Call.find({ campaignId: { $in: campaignIds } });

      let totalCalls = calls.length;
      let connectedCalls = calls.filter((c: any) => c.callStatus === 'answered' || c.callStatus === 'completed').length;
      let talkTimeSeconds = calls.reduce((acc: number, c: any) => acc + (c.durationSeconds || 0), 0);

      return {
        id: a._id.toString(),
        name: a.name,
        agentName: a.agentName,
        orgName: a.orgName,
        prompt: a.prompt,
        voice: a.voice,
        language: a.language,
        aiModel: a.aiModel,
        temperature: a.temperature,
        gender: "Male",
        status: "Active",
        totalCalls,
        connectedCalls,
        talkTimeSeconds
      };
    }));

    return NextResponse.json(formattedAgents);
  } catch (error: any) {
    console.error("Failed to fetch agents:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.split(" ")[1];
    const decoded = await verifyToken(token);
    
    if (!decoded) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const clientEmail = decoded.email;

    const client = await Client.findOne({ email: clientEmail });
    
    if (!client) {
      return NextResponse.json({ error: "No client found" }, { status: 400 });
    }

    const body = await req.json();
    
    if (body.id && body.id.length === 24) { // valid objectId
      const updated = await Agent.findOneAndUpdate(
        { _id: body.id, clientId: client._id },
        {
          name: body.name,
          agentName: body.agentName,
          orgName: body.orgName,
          prompt: body.prompt,
          voice: body.voice,
          language: body.language,
          aiModel: body.aiModel,
          temperature: body.temperature,
        },
        { new: true }
      );
      if (!updated) {
        return NextResponse.json({ error: "Agent not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, agent: updated });
    } else {
      // Create new
      const newAgent = await Agent.create({
        clientId: client._id,
        name: body.name,
        agentName: body.agentName,
        orgName: body.orgName,
        prompt: body.prompt,
        voice: body.voice || "Puck",
        language: body.language || "hi-IN",
        aiModel: body.aiModel || "gemini-3.1-flash-live-preview",
        temperature: body.temperature || 0.6,
      });
      return NextResponse.json({ success: true, agent: newAgent });
    }
  } catch (error: any) {
    console.error("Failed to save agent:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
