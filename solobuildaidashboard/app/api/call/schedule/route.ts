import { NextResponse } from "next/server";
import { qstashClient } from "@/lib/qstash";

export async function POST(req: Request) {
  try {
    const { leads, delayMinutes = 1, intervalMinutes = 2, campaignId } = await req.json();

    if (!leads || !Array.isArray(leads) || leads.length === 0) {
      return NextResponse.json({ error: "Missing or invalid 'leads' array" }, { status: 400 });
    }

    const clientEmail = req.headers.get("x-client-email");
    if (!clientEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Determine target host URL for /api/call/initiate
    const host = req.headers.get("host") || "localhost:7860";
    const proto = req.headers.get("x-forwarded-proto") || "http";
    const initiateUrl = process.env.PUBLIC_URL 
      ? `${process.env.PUBLIC_URL.replace(/\/$/, "")}/api/call/initiate` 
      : `${proto}://${host}/api/call/initiate`;

    console.log(`[SCHEDULE] Target initiate URL: ${initiateUrl}`);

    const results = [];

    for (let i = 0; i < leads.length; i++) {
      const lead = leads[i];
      // Delay computation: initial delay + index * interval
      const delayAmount = Number(delayMinutes) + (i * Number(intervalMinutes));
      const delayString = `${delayAmount}m`;

      console.log(`[SCHEDULE] Scheduling lead ${lead.customerName || lead.name} (${lead.phoneNumber || lead.phone}) with delay ${delayString}`);

      try {
        const res = await qstashClient.publishJSON({
          url: initiateUrl,
          body: {
            phoneNumber: lead.phoneNumber || lead.phone,
            campaignId: campaignId || lead.campaignId,
            contactId: lead.id || lead.contactId,
          },
          headers: {
            "x-client-email": clientEmail,
          },
          delay: delayString as any,
        });

        results.push({
          phoneNumber: lead.phoneNumber || lead.phone,
          messageId: (res as any).messageId,
          delay: delayString,
        });
      } catch (err: any) {
        console.error(`[SCHEDULE] Failed to schedule for ${lead.phoneNumber || lead.phone}:`, err);
        results.push({
          phoneNumber: lead.phoneNumber || lead.phone,
          error: err.message || "Failed to schedule",
        });
      }
    }

    return NextResponse.json({
      success: true,
      scheduledCount: results.filter(r => !r.error).length,
      results,
    });
  } catch (error: any) {
    console.error("[SCHEDULE] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to process schedule request" }, { status: 500 });
  }
}
