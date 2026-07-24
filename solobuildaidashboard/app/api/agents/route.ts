import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Agent } from "@/lib/models";
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

    await dbConnect();
    const agents = await Agent.find({ clientId: client._id }).sort({ createdAt: -1 });
    
    const { Call } = require("@/lib/models");

    // Count total calls for this client (used as fallback for single-agent accounts)
    const totalClientCalls = await Call.countDocuments({ clientId: client._id });
    const isSingleAgent = agents.length === 1;

    const formattedAgents = await Promise.all(agents.map(async (a: any) => {
      // Primary query: calls directly linked to this agent by ObjectId
      const directCallsQuery = {
        clientId: client._id,
        agentId: a._id,
      };

      // Fallback query for single-agent: all client calls (catches manually dialled
      // calls that were initiated without an agentId in the request)
      const statsQuery = isSingleAgent
        ? { clientId: client._id } // all calls belong to the one agent
        : directCallsQuery;

      const [totalCalls, connectedCalls, talkTimeAgg] = await Promise.all([
        Call.countDocuments(statsQuery),
        Call.countDocuments({
          ...statsQuery,
          callStatus: { $in: ['answered', 'completed'] },
        }),
        Call.aggregate([
          { $match: statsQuery },
          { $group: { _id: null, total: { $sum: '$durationSeconds' } } },
        ]),
      ]);

      const talkTimeSeconds = talkTimeAgg[0]?.total || 0;

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
        talkTimeSeconds,
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
    const { client, isAuthenticated } = await getAuthClient(req);
    
    if (!isAuthenticated || !client) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    await dbConnect();
    
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
