import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Call } from "@/lib/models";
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

    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = Math.min(500, Math.max(1, parseInt(url.searchParams.get("limit") || "500", 10)));
    const skip = (page - 1) * limit;

    const [dbCalls, totalCount, completedCount] = await Promise.all([
      Call.find({ clientId: client._id }).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Call.countDocuments({ clientId: client._id }),
      Call.countDocuments({ clientId: client._id, callStatus: "completed" })
    ]);
    
    const callLogs = dbCalls.map((call) => {
      const durationSeconds = call.durationSeconds || 0;
      const minutes = Math.floor(durationSeconds / 60);
      const seconds = durationSeconds % 60;
      const durationString = durationSeconds > 0 ? `${minutes}m ${seconds}s` : "--";

      // Reconstruct user-friendly date format
      const formattedDate = call.createdAt ? new Date(call.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "Asia/Kolkata",
      }) + ", " + new Date(call.createdAt).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Kolkata",
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

    return new NextResponse(JSON.stringify(callLogs), {
      headers: {
        "Content-Type": "application/json",
        "X-Total-Count": String(totalCount),
        "X-Completed-Count": String(completedCount)
      }
    });
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
    case "busy":
    case "canceled":
    case "cancelled":
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
