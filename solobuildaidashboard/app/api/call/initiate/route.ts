import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Client, Call, Agent } from "@/lib/models";
import { verifyToken } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { phoneNumber, campaignId, contactId, agentId } = await req.json();

    if (!phoneNumber) {
      return NextResponse.json({ error: "Missing 'phoneNumber' in the request body" }, { status: 400 });
    }

    const sanitizedPhone = phoneNumber.replace(/\s+/g, "");

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

    const client = await Client.findOne({ email: clientEmail }).select("+vobiz.authToken");
    
    if (!client) {
      return NextResponse.json({ error: "No client found" }, { status: 400 });
    }

    if (!client.vobiz || !client.vobiz.authId || !client.vobiz.authToken) {
      return NextResponse.json({ error: "Vobiz configuration is missing for this client" }, { status: 400 });
    }

    const authId = client.vobiz?.authId || process.env.VOBIZ_AUTH_ID;
    const authToken = client.vobiz?.authToken || process.env.VOBIZ_AUTH_TOKEN;
    const fromNumber = client.vobiz?.phoneNumber || process.env.VOBIZ_PHONE_NUMBER;

    if (!authId || !authToken) {
      return NextResponse.json({ error: "Vobiz Auth configuration is missing from both Client database and environment variables" }, { status: 400 });
    }

    // Construct the Vobiz answer callback URL using Next.js request headers
    const host = req.headers.get("host") || "localhost:7860";
    const proto = req.headers.get("x-forwarded-proto") || "http";
    let answerUrl = process.env.PUBLIC_URL 
      ? `${process.env.PUBLIC_URL.replace(/\/$/, "")}/api/call/answer` 
      : `${proto}://${host}/api/call/answer`;

    if (agentId) {
      const dbAgent = await Agent.findById(agentId);
      if (dbAgent) {
        // Pass both agentId, agentName and orgName via query params
        answerUrl += `?agentId=${agentId}&agentName=${dbAgent.agentName}&orgName=${dbAgent.orgName}`;
      } else {
        answerUrl += `?agentId=${agentId}`;
      }
    }

    console.log(`[INITIATE] Triggering outbound Vobiz call. Target: ${sanitizedPhone}, Answer URL: ${answerUrl}`);

    // Call the Vobiz REST API
    const vobizUrl = `https://api.vobiz.ai/api/v1/Account/${authId}/Call/`;
    const response = await fetch(vobizUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Auth-ID": authId,
        "X-Auth-Token": authToken,
      },
      body: JSON.stringify({
        to: sanitizedPhone,
        from: fromNumber,
        answer_url: answerUrl,
        answer_method: "POST",
      }),
    });

    const responseText = await response.text();
    console.log(`[INITIATE] Vobiz Response Status: ${response.status}, Body: ${responseText}`);

    if (response.status !== 201) {
      return NextResponse.json({ error: `Vobiz API returned status ${response.status}: ${responseText}` }, { status: response.status });
    }

    const result = JSON.parse(responseText);
    const callUuid = result.request_uuid || result.call_uuid || "unknown";

    // Create call entry in database
    if (client) {
      const callData: any = {
        clientId: client._id,
        direction: "outbound",
        providerCallId: callUuid,
        fromNumber: fromNumber,
        toNumber: sanitizedPhone,
        callStatus: "initiated",
        startedAt: new Date(),
      };

      if (campaignId) {
        callData.campaignId = campaignId;
      }
      if (contactId) {
        callData.contactId = contactId;
      }

      await Call.create(callData);
      console.log(`[INITIATE] Created database call record for UUID: ${callUuid}`);
    }

    return NextResponse.json({
      call_uuid: callUuid,
      status: "call_initiated",
      phone_number: sanitizedPhone,
    });
  } catch (error: any) {
    console.error("Error initiating call:", error);
    return NextResponse.json({ error: error.message || "Failed to initiate outbound call" }, { status: 500 });
  }
}
