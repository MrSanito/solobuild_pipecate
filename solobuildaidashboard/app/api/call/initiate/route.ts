import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Client, Call } from "@/lib/models";

export async function POST(req: Request) {
  try {
    const { phoneNumber, name, leadId } = await req.json();

    if (!phoneNumber) {
      return NextResponse.json({ error: "Missing 'phoneNumber' in the request body" }, { status: 400 });
    }

    const sanitizedPhone = phoneNumber.replace(/\s+/g, "");

    await dbConnect();

    // Find the client with email contact@solobuildai.com to fetch credentials
    let client = await Client.findOne({ email: "contact@solobuildai.com" }).select("+vobiz.authToken");
    if (!client) {
      // Fallback to any client if contact@solobuildai.com isn't present
      client = await Client.findOne().select("+vobiz.authToken");
    }

    // Self-healing: If no client exists in the DB, create a default client using env variables
    if (!client) {
      const envAuthId = process.env.VOBIZ_AUTH_ID;
      const envAuthToken = process.env.VOBIZ_AUTH_TOKEN;
      const envPhone = process.env.VOBIZ_PHONE_NUMBER;

      if (!envAuthId || !envAuthToken) {
        return NextResponse.json({ error: "Vobiz Auth configuration is missing from environment variables" }, { status: 400 });
      }

      client = await Client.create({
        name: "Solobuild AI User",
        slug: "solobuild-ai-user",
        email: "contact@solobuildai.com",
        passwordHash: "placeholder_hash_value", // required by ClientSchema
        vobiz: {
          authId: envAuthId,
          authToken: envAuthToken,
          phoneNumber: envPhone,
        }
      });
      console.log(`[INITIATE] Database clients collection was empty. Created default client: ${client._id}`);
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
      ? (process.env.PUBLIC_URL.startsWith("http") ? process.env.PUBLIC_URL.replace(/\/$/, "") : `https://${process.env.PUBLIC_URL.replace(/\/$/, "")}`)
      : `${proto}://${host}`;
    
    answerUrl = `${answerUrl}/api/call/answer`;

    // Append name, number, and lead_id to the answer callback URL manually
    const queryParams: string[] = [];
    if (name) queryParams.push(`name=${encodeURIComponent(name)}`);
    if (sanitizedPhone) queryParams.push(`number=${encodeURIComponent(sanitizedPhone)}`);
    if (leadId) queryParams.push(`lead_id=${encodeURIComponent(leadId)}`);

    if (queryParams.length > 0) {
      answerUrl = `${answerUrl}?${queryParams.join("&")}`;
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
      await Call.create({
        clientId: client._id,
        direction: "outbound",
        providerCallId: callUuid,
        fromNumber: fromNumber,
        toNumber: sanitizedPhone,
        callStatus: "initiated",
        startedAt: new Date(),
        ...(leadId ? { contactId: leadId } : {}),
      });
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
