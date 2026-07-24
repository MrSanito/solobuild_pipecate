import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Call, Client } from "@/lib/models";
import fs from "fs";
import path from "path";
import { uploadRecording, uploadRecordingBuffer } from "@/lib/cloudinary";

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

        // Upload to Cloudinary directly from buffer
        let cloudinaryUrl = "";
        try {
          cloudinaryUrl = await uploadRecordingBuffer(buffer, recordingId);
        } catch (cloudinaryErr) {
          console.error(`[RECORDING] Cloudinary upload failed:`, cloudinaryErr);
        }

        // Update database call entry
        if (callEntry) {
          callEntry.recordingId = recordingId;
          callEntry.recordingUri = recordUrl;
          callEntry.recordingCloudinaryUrl = cloudinaryUrl;
          
          // Preserve hangup metrics if they were already recorded by the hangup callback
          if (!callEntry.endedAt) {
            callEntry.endedAt = new Date();
          }
          if (!callEntry.durationSeconds && callEntry.startedAt) {
            callEntry.durationSeconds = Math.round((callEntry.endedAt.getTime() - callEntry.startedAt.getTime()) / 1000);
          }
          if (!callEntry.callStatus || callEntry.callStatus === "initiated" || callEntry.callStatus === "ringing" || callEntry.callStatus === "answered") {
            callEntry.callStatus = "completed";
          }

          // Gemini analysis integration
          const client = await Client.findById(callEntry.clientId).select("+geminiApiKey");
          const apiKey = client?.geminiApiKey || process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
          if (apiKey) {
            try {
              console.log(`[RECORDING] Starting Gemini analysis for CallUUID=${callUuid}`);
              const base64Audio = buffer.toString("base64");
              const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
              
              const prompt = `You are a call analyst.

1. Transcribe the entire call.
2. Label speakers as Customer and Agent.
3. Return timestamps.
4. Generate a concise summary.
5. Detect customer intent.
6. Detect sentiment.
7. Determine the Call Status and Sub status based on these exact rules:

Status:
- "Not contacted": This is the default status (if the call didn't connect, was not answered, or failed to connect to anyone).
- "Contacted": If the call was missed (ringing out with no answer) or went to voicemail.
- "Answered": If the call was answered by the customer and a conversation took place.
- "Follow Up": If the customer explicitly asks the agent to call back at a certain time.

Sub status (Only affected if Status is "Answered" or "Follow Up"):
- "<1 Min": If the call/conversation duration is less than 1 minute.
- "1-3 Mins": If the call/conversation duration is between 1 and 3 minutes.
- "+3 Mins": If the call/conversation duration is more than 3 minutes.
- "Appointment Set": If the customer agrees to set up a meeting, schedule an appointment, or book a demo. (This takes precedence over the duration-based sub statuses if a meeting/appointment is agreed upon).

Return ONLY JSON.`;

              const geminiResponse = await fetch(geminiUrl, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({
                  contents: [
                    {
                      parts: [
                        {
                          inlineData: {
                            mimeType: "audio/wav",
                            data: base64Audio
                          }
                        },
                        {
                          text: prompt
                        }
                      ]
                    }
                  ],
                  generationConfig: {
                    responseMimeType: "application/json",
                    responseSchema: {
                      type: "OBJECT",
                      properties: {
                        transcript: {
                          type: "ARRAY",
                          items: {
                            type: "OBJECT",
                            properties: {
                              speaker: { type: "STRING", enum: ["Customer", "Agent"] },
                              timestamp: { type: "STRING" },
                              text: { type: "STRING" }
                            },
                            required: ["speaker", "text"]
                          }
                        },
                        summary: { type: "STRING" },
                        intent: { type: "STRING" },
                        sentiment: { type: "STRING" },
                        actionItems: {
                          type: "ARRAY",
                          items: { type: "STRING" }
                        },
                        status: {
                          type: "STRING",
                          enum: ["Not contacted", "Contacted", "Answered", "Follow Up"]
                        },
                        subStatus: {
                          type: "STRING",
                          enum: ["<1 Min", "1-3 Mins", "+3 Mins", "Appointment Set", "None"]
                        }
                      },
                      required: ["transcript", "summary", "intent", "sentiment", "actionItems", "status", "subStatus"]
                    }
                  }
                })
              });

              if (geminiResponse.ok) {
                const geminiJson = await geminiResponse.json();
                const textResult = geminiJson.candidates?.[0]?.content?.parts?.[0]?.text;
                if (textResult) {
                  const analysisResult = JSON.parse(textResult);
                  console.log(`[RECORDING] Gemini analysis completed successfully for CallUUID=${callUuid}`);

                  // Helper function to parse timestamp to seconds
                  const parseTimestampToSeconds = (tsStr?: string): number => {
                    if (!tsStr) return 0;
                    const parts = tsStr.split(":").map(Number);
                    if (parts.length === 3) {
                      return parts[0] * 3600 + parts[1] * 60 + parts[2];
                    } else if (parts.length === 2) {
                      return parts[0] * 60 + parts[1];
                    }
                    return 0;
                  };

                  // Map to TranscriptTurn schema
                  callEntry.transcript = (analysisResult.transcript || []).map((turn: any, index: number) => ({
                    speaker: turn.speaker.toLowerCase() === "agent" ? "agent" : "contact",
                    text: turn.text,
                    ts: parseTimestampToSeconds(turn.timestamp) || index
                  }));

                  callEntry.transcriptSummary = analysisResult.summary;
                  callEntry.analysis = {
                    sentiment: analysisResult.sentiment,
                    intent: analysisResult.intent,
                    actionItems: analysisResult.actionItems || [],
                    status: analysisResult.status,
                    subStatus: analysisResult.subStatus === "None" ? "" : (analysisResult.subStatus || "")
                  };
                } else {
                  console.error(`[RECORDING] Empty content parts returned from Gemini API`);
                }
              } else {
                console.error(`[RECORDING] Gemini API error: ${geminiResponse.status} ${await geminiResponse.text()}`);
              }
            } catch (err: any) {
              console.error(`[RECORDING] Exception during Gemini analysis:`, err);
            }
          } else {
            console.warn(`[RECORDING] Gemini API key not found in environment, skipping analysis`);
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
