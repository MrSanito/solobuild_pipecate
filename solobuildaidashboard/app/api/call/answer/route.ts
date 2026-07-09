import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Call } from "@/lib/models";

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
    const name = searchParams.get("name") || "";
    const number = searchParams.get("number") || "";
    const leadId = searchParams.get("lead_id") || "";

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

    // Check if the call is marked for transfer
    if (CallUUID) {
      const callEntry = await Call.findOne({ providerCallId: CallUUID });
      if (callEntry && (callEntry as any).transfer_requested) {
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
    }

    // Normal flow: construct stream XML pointing to Pipecat cloud websocket
    const host = req.headers.get("host") || "localhost:7860";
    const proto = req.headers.get("x-forwarded-proto") || "http";
    const env = (process.env.ENV || "local").toLowerCase();

    let finalWsUrl = "";

    if (env === "production") {
      const agentName = process.env.AGENT_NAME || "quickstart-agent";
      const apiKey = process.env.DAILY_API_KEY || "";
      
      try {
        console.log(`[ANSWER] Requesting Pipecat Cloud start for agent: ${agentName}`);
        const startUrl = `https://api.pipecat.daily.co/v1/public/${agentName}/start`;
        
        let parsedBody: any = {};
        if (bodyData) {
          try {
            parsedBody = JSON.parse(bodyData);
          } catch (e) {}
        }

        const startResponse = await fetch(startUrl, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            transport: "websocket",
            body: {
              name: name || parsedBody.name || "",
              number: number || parsedBody.number || "",
              lead_id: leadId || parsedBody.lead_id || "",
              campaign: parsedBody.campaign || "sales",
              language: parsedBody.language || "hi"
            }
          })
        });

        if (startResponse.ok) {
          const startRes = await startResponse.json();
          const token = startRes.token;
          const wsUrl = startRes.wsUrl;
          const resBody = startRes.body;
          finalWsUrl = `${wsUrl}?token=${token}&body=${resBody}`;
          console.log(`[ANSWER] Dynamic WS URL received: ${finalWsUrl}`);
        } else {
          const errText = await startResponse.text();
          console.error(`[ANSWER] Start endpoint failed: status ${startResponse.status}, body: ${errText}`);
          throw new Error("Start API returned non-200");
        }
      } catch (err) {
        console.warn("[ANSWER] Falling back to static URL construction:", err);
        const region = process.env.REGION || "ap-south";
        const orgName = process.env.ORGANIZATION_NAME || "";
        finalWsUrl = `wss://${region}.api.pipecat.daily.co/ws/generic?serviceHost=${agentName}.${orgName}`;
        if (bodyData) {
          const bodyEncoded = Buffer.from(bodyData).toString("base64");
          finalWsUrl = `${finalWsUrl}&body=${bodyEncoded}`;
        }
        if (name) finalWsUrl = `${finalWsUrl}&name=${encodeURIComponent(name)}`;
        if (number) finalWsUrl = `${finalWsUrl}&number=${encodeURIComponent(number)}`;
        if (leadId) finalWsUrl = `${finalWsUrl}&lead_id=${encodeURIComponent(leadId)}`;
      }
    } else {
      // Local/Ngrok websocket url
      finalWsUrl = `wss://${host}/voice/ws`;
      const urlParams = new URLSearchParams();  
      if (bodyData) {
        const bodyEncoded = Buffer.from(bodyData).toString("base64");
        urlParams.set("body", bodyEncoded);
      }
      if (name) urlParams.set("name", name);
      if (number) urlParams.set("number", number);
      if (leadId) urlParams.set("lead_id", leadId);
      
      const queryStr = urlParams.toString();
      if (queryStr) {
        finalWsUrl = `${finalWsUrl}?${queryStr}`;
      }
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
        ${finalWsUrl}
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
