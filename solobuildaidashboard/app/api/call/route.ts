import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Call, Client } from "@/lib/models";
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
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const dbCalls = await Call.find({ clientId: client._id }).sort({ createdAt: -1 }).limit(50);
    
    const callLogs = dbCalls.map((call) => {
      const durationSeconds = call.durationSeconds || 0;
      const minutes = Math.floor(durationSeconds / 60);
      const seconds = durationSeconds % 60;
      const durationString = durationSeconds > 0 ? `${minutes}m ${seconds}s` : "--";

      // Reconstruct user-friendly date format
      const formattedDate = call.createdAt ? new Date(call.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }) + ", " + new Date(call.createdAt).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }) : "--";

      return {
        id: call._id.toString(),
        customerName: `Customer (${call.toNumber.slice(-4)})`,
        company: "Outbound Dial",
        phoneNumber: call.toNumber,
        duration: durationString,
        status: mapStatus(call.callStatus),
        assignedAgent: "quickstart-agent",
        campaign: "Manual Dial",
        callDate: formattedDate,
        transcript: call.transcript && call.transcript.length > 0 ? call.transcript : (call.transcriptSummary || "AI Transcript will appear here after call completion."),
        summary: call.transcriptSummary || "Outbound voice call campaign.",
        recordingPath: call.recordingCloudinaryUrl || call.recordingLocalPath || call.recordingUri || undefined,
        recordingCloudinaryUrl: call.recordingCloudinaryUrl || undefined,
        recordingVobizUrl: call.recordingUri || undefined,
        analysis: call.analysis || undefined,
      };
    });

    return NextResponse.json(callLogs);
  } catch (error: any) {
    console.error("Failed to fetch call logs:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch call logs" }, { status: 500 });
  }
}

function mapStatus(dbStatus: string): "Completed" | "No Answer" | "Voicemail" | "Failed" | "In Progress" | "Pending" {
  switch (dbStatus) {
    case "completed":
      return "Completed";
    case "no_answer":
      return "No Answer";
    case "voicemail":
      return "Voicemail";
    case "failed":
      return "Failed";
    case "initiated":
    case "ringing":
    case "answered":
      return "In Progress";
    default:
      return "Pending";
  }
}
