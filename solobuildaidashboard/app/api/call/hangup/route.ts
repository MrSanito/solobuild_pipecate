import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Call, Campaign } from "@/lib/models";

const SHORT_CALL_THRESHOLD_SEC = 0;

export async function GET(req: Request) {
  return handleHangup(req);
}

export async function POST(req: Request) {
  return handleHangup(req);
}

async function handleHangup(req: Request) {
  try {
    const url = new URL(req.url);
    let payload: any = {};
    url.searchParams.forEach((val, key) => {
      payload[key] = val;
    });

    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("form")) {
      try {
        const formData = await req.formData();
        formData.forEach((val, key) => {
          payload[key] = val;
        });
      } catch (e) {
        console.error("[HANGUP] Error parsing form data:", e);
      }
    } else if (contentType.includes("json")) {
      try {
        const bodyJson = await req.json();
        payload = { ...payload, ...bodyJson };
      } catch (e) {
        console.error("[HANGUP] Error parsing JSON body:", e);
      }
    }

    console.log("[HANGUP] Received callback payload:", payload);

    const CallUUID = payload.CallUUID || payload.call_uuid;
    const RequestUUID = payload.RequestUUID || payload.request_uuid;
    const CallStatus = payload.CallStatus || payload.call_status;
    const AnswerTime = payload.AnswerTime || payload.answer_time;
    const HangupCause = payload.HangupCause || payload.hangup_cause;
    const HangupCauseName = payload.HangupCauseName || payload.hangup_cause_name;
    const Duration = payload.Duration || payload.duration;

    const uuid = CallUUID || RequestUUID;

    if (!uuid) {
      console.warn("[HANGUP] Warning: Missing CallUUID or RequestUUID in payload");
      return NextResponse.json({ success: true, message: "No UUID provided" }, { status: 200 });
    }

    await dbConnect();

    const wasAnswered = Boolean(AnswerTime && String(AnswerTime).trim());
    const endedAt = new Date();
    const durationSec = Number(Duration) || 0;

    // Find the current call entry
    const dbCall = await Call.findOne({ providerCallId: uuid });
    if (!dbCall) {
      console.warn(`[HANGUP] Call record not found in database for providerCallId: ${uuid}`);
      return NextResponse.json({ success: true, message: "Call record not found" }, { status: 200 });
    }

    let callStatus = "completed";
    let answeredAt: Date | undefined = undefined;

    if (!wasAnswered) {
      // Call never connected — ring to auto-cut, busy, ya decline
      const reason = (CallStatus || "").toLowerCase();
      const cause = (HangupCause || "").toLowerCase();
      const causeName = (HangupCauseName || "").toLowerCase();

      if (reason === "busy" || cause.includes("busy")) {
        callStatus = "busy";
      } else if (reason === "no-answer" || reason === "no_answer" || cause.includes("no-answer") || cause.includes("no_answer")) {
        callStatus = "no_answer";
      } else if (reason === "cancel" || cause.includes("cancel") || causeName.includes("cancel")) {
        callStatus = "no_answer";
      } else if (cause.includes("voicemail")) {
        callStatus = "voicemail";
      } else {
        callStatus = "failed";
      }

      dbCall.callStatus = callStatus;
      dbCall.endedAt = endedAt;
      dbCall.outcome = `Rejected: ${CallStatus || HangupCauseName || HangupCause || "Unknown"}`;
      await dbCall.save();
      console.log(`[HANGUP] Call marked as rejected (not answered). UUID: ${uuid}, status: ${callStatus}`);
    } else if (SHORT_CALL_THRESHOLD_SEC > 0 && durationSec < SHORT_CALL_THRESHOLD_SEC) {
      // Answered but cut too fast
      callStatus = "failed";
      dbCall.callStatus = "failed";
      dbCall.endedAt = endedAt;
      dbCall.durationSeconds = durationSec;
      dbCall.outcome = `Rejected: cut too fast (${durationSec}s)`;
      if (AnswerTime) {
        try {
          answeredAt = new Date(AnswerTime);
          if (!isNaN(answeredAt.getTime())) {
            dbCall.answeredAt = answeredAt;
          }
        } catch (e) {}
      }
      await dbCall.save();
      console.log(`[HANGUP] Call marked as rejected (cut too fast). UUID: ${uuid}, duration: ${durationSec}s`);
    } else {
      // Normal completed call
      if (AnswerTime) {
        try {
          answeredAt = new Date(AnswerTime);
          if (isNaN(answeredAt.getTime())) {
            answeredAt = dbCall.startedAt || dbCall.createdAt || new Date();
          }
        } catch (e) {
          answeredAt = dbCall.startedAt || dbCall.createdAt || new Date();
        }
      } else {
        answeredAt = dbCall.answeredAt || dbCall.startedAt || dbCall.createdAt || new Date();
      }

      dbCall.callStatus = "completed";
      dbCall.answeredAt = answeredAt;
      dbCall.endedAt = endedAt;
      dbCall.durationSeconds = durationSec || Math.max(0, Math.floor((endedAt.getTime() - answeredAt.getTime()) / 1000));
      await dbCall.save();
      console.log(`[HANGUP] Call marked as completed. UUID: ${uuid}, duration: ${dbCall.durationSeconds}s`);
    }

    // If campaign details exist, update campaign contact status
    if (dbCall.campaignId && dbCall.contactId) {
      try {
        const campaign = await Campaign.findById(dbCall.campaignId);
        if (campaign) {
          const contact = campaign.contacts.id(dbCall.contactId);
          if (contact) {
            contact.callAttempts = (contact.callAttempts || 0) + 1;
            contact.lastCallAt = endedAt;
            contact.lastCallStatus = callStatus;
            contact.status = (callStatus === "completed") ? "completed" : "failed";
            
            await campaign.save();
            console.log(`[HANGUP] Updated Campaign Contact status for Contact: ${dbCall.contactId}`);
          }
        }
      } catch (err) {
        console.error("[HANGUP] Error updating Campaign Contact:", err);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Hangup callback processed successfully",
      received: {
        uuid,
        status: callStatus,
        duration: durationSec,
      }
    }, { status: 200 });
  } catch (error: any) {
    console.error("[HANGUP] Error handling callback:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
