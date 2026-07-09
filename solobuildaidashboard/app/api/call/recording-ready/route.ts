import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Call, Client } from "@/lib/models";
import fs from "fs";
import path from "path";

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let recordUrl = "";
    let recordingId = "";
    let callUuid = "";

    if (contentType.includes("form")) {
      const formData = await req.formData();
      recordUrl = (formData.get("RecordUrl") || "") as string;
      recordingId = (formData.get("RecordingID") || "") as string;
      callUuid = (formData.get("CallUUID") || "") as string;
    } else {
      try {
        const body = await req.json();
        recordUrl = body.RecordUrl || body.record_url || "";
        recordingId = body.RecordingID || body.recording_id || "";
        callUuid = body.CallUUID || body.call_uuid || "";
      } catch (e) {
        const { searchParams } = new URL(req.url);
        recordUrl = searchParams.get("RecordUrl") || "";
        recordingId = searchParams.get("RecordingID") || "";
        callUuid = searchParams.get("CallUUID") || "";
      }
    }

    console.log(`[RECORDING] Callback received: CallUUID=${callUuid}, ID=${recordingId}, URL=${recordUrl}`);

    if (recordUrl && recordingId) {
      await dbConnect();

      // Find call log to get client context
      const callEntry = await Call.findOne({ providerCallId: callUuid });
      let authId = process.env.VOBIZ_AUTH_ID;
      let authToken = process.env.VOBIZ_AUTH_TOKEN;

      if (callEntry) {
        const client = await Client.findById(callEntry.clientId).select("+vobiz.authToken");
        if (client?.vobiz?.authId) {
          authId = client.vobiz.authId;
          authToken = client.vobiz.authToken;
        }
      }

      console.log(`[RECORDING] Downloading recording from Vobiz: ${recordUrl}`);
      const fileResponse = await fetch(recordUrl, {
        headers: {
          "X-Auth-ID": authId || "",
          "X-Auth-Token": authToken || "",
        }
      });

      if (fileResponse.ok) {
        const arrayBuffer = await fileResponse.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Ensure public/recordings directory exists
        const dirPath = path.join(process.cwd(), "public", "recordings");
        if (!fs.existsSync(dirPath)) {
          fs.mkdirSync(dirPath, { recursive: true });
        }

        const filename = `${recordingId}.wav`;
        const filePath = path.join(dirPath, filename);
        fs.writeFileSync(filePath, buffer);
        console.log(`[RECORDING] Recording saved locally to: ${filePath}`);

        // Update database call entry
        if (callEntry) {
          callEntry.recordingId = recordingId;
          callEntry.recordingUri = recordUrl;
          callEntry.recordingLocalPath = `/recordings/${filename}`;
          callEntry.callStatus = "completed";
          callEntry.endedAt = new Date();
          
          if (callEntry.startedAt) {
            callEntry.durationSeconds = Math.round((new Date().getTime() - callEntry.startedAt.getTime()) / 1000);
          }
          
          await callEntry.save();
          console.log(`[RECORDING] Updated call log ${callUuid} in database`);
        }
      } else {
        console.error(`[RECORDING] Failed to download recording file: ${fileResponse.status} ${await fileResponse.text()}`);
      }
    }

    return new NextResponse("<Response></Response>", {
      headers: { "Content-Type": "application/xml" },
    });
  } catch (error: any) {
    console.error("[RECORDING] Error handling recording-ready callback:", error);
    return new NextResponse("<Response></Response>", {
      headers: { "Content-Type": "application/xml" },
    });
  }
}
