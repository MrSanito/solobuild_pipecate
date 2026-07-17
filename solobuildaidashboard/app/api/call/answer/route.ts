import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Call, Client } from "@/lib/models";

export async function GET(req: Request) {
  return handleAnswer(req);
}

export async function POST(req: Request) {
  return handleAnswer(req);
}

async function handleAnswer(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    
    // Parse query params first
    let CallUUID = searchParams.get("CallUUID") || searchParams.get("call_uuid");
    let bodyData = searchParams.get("body_data") || searchParams.get("body");

    // Also parse form data / body if present
    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("form") || contentType.includes("json")) {
      try {
        if (contentType.includes("form")) {
          const formData = await req.formData();
          if (!CallUUID) CallUUID = (formData.get("CallUUID") || formData.get("call_uuid")) as string;
          if (!bodyData) bodyData = (formData.get("body_data") || formData.get("body")) as string;
        } else {
          const bodyJson = await req.json();
          if (!CallUUID) CallUUID = bodyJson.CallUUID || bodyJson.call_uuid;
          if (!bodyData) bodyData = bodyJson.body_data || bodyJson.body;
        }
      } catch (e) {
        // Silently skip body parsing errors
      }
    }

    console.log(`[ANSWER] CallUUID: ${CallUUID}, bodyData: ${bodyData}`);

    await dbConnect();

    let clientGeminiApiKey = "";

    // Check if the call is marked for transfer
    if (CallUUID) {
      const callEntry = await Call.findOne({ providerCallId: CallUUID });
      if (callEntry) {
        if ((callEntry as any).transfer_requested) {
          const agentNumber = process.env.TRANSFER_AGENT_NUMBER || "";
          const transferXml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Speak voice="WOMAN" language="en-US">
        Please hold while I transfer you to a human agent.
    </Speak>
    <Dial>${agentNumber}</Dial>
</Response>`;
          
          callEntry.callStatus = "completed";
          await callEntry.save();

          return new NextResponse(transferXml, {
            headers: { "Content-Type": "application/xml" },
          });
        }

        // Fetch the client to retrieve their Gemini API Key
        const client = await Client.findById(callEntry.clientId).select("+geminiApiKey");
        if (client && client.geminiApiKey) {
          clientGeminiApiKey = client.geminiApiKey;
          console.log(`[ANSWER] Found client Gemini API key for Client: ${client._id}`);
        }
      }
    }

    // Normal flow: construct stream XML pointing to Pipecat cloud websocket
    const host = req.headers.get("host") || "localhost:7860";
    const proto = req.headers.get("x-forwarded-proto") || "http";
    const env = (process.env.ENV || "local").toLowerCase();

    let finalWsUrl = "";

    let bodyObj: any = {};
    if (bodyData) {
      try {
        let decoded = bodyData;
        if (!bodyData.trim().startsWith("{")) {
          decoded = Buffer.from(bodyData, "base64").toString("utf-8");
        }
        bodyObj = JSON.parse(decoded);
      } catch (e) {
        console.warn("[ANSWER] Failed to parse bodyData", e);
      }
    }

    if (clientGeminiApiKey) {
      bodyObj.gemini_api_key = clientGeminiApiKey;
    }

    const bodyEncoded = Buffer.from(JSON.stringify(bodyObj)).toString("base64");

    if (env === "production") {
      const region = process.env.REGION || "ap-south";
      const agentName = process.env.AGENT_NAME || "quickstart-agent";
      const orgName = process.env.ORGANIZATION_NAME || "";
      finalWsUrl = `wss://${region}.api.pipecat.daily.co/ws/generic?serviceHost=${agentName}.${orgName}&body=${bodyEncoded}`;
    } else {
      // Local/Ngrok websocket url
      finalWsUrl = `wss://${host}/voice/ws?body=${bodyEncoded}`;
    }

    const vobizEncoding = process.env.VOBIZ_ENCODING || "audio/x-mulaw";
    const vobizRate = process.env.VOBIZ_SAMPLE_RATE || "8000";
    const contentTypeHeader = `${vobizEncoding};rate=${vobizRate}`;

    const recordCallbackUrl = process.env.PUBLIC_URL 
      ? `${process.env.PUBLIC_URL.replace(/\/$/, "")}/api/call/recording-ready` 
      : `${proto}://${host}/api/call/recording-ready`;

    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Record fileFormat="wav" maxLength="3600" recordSession="true" callbackUrl="${recordCallbackUrl}" callbackMethod="POST">
    </Record>
    <Stream bidirectional="true" audioTrack="inbound" contentType="${contentTypeHeader}" keepCallAlive="true">
        ${finalWsUrl.replace(/&/g, "&amp;")}
    </Stream>
</Response>`;

    console.log("[ANSWER] Generated XML:\n", xmlContent);

    return new NextResponse(xmlContent, {
      headers: { "Content-Type": "application/xml" },
    });
  } catch (error: any) {
    console.error("[ANSWER] Error generating answer XML:", error);
    const errorXml = `<?xml version="1.0" encoding="UTF-8"?><Response><Speak>Error connecting call.</Speak></Response>`;
    return new NextResponse(errorXml, {
      status: 500,
      headers: { "Content-Type": "application/xml" },
    });
  }
}
