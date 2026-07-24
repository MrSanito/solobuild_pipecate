import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Client } from "@/lib/models";
import { getAuthClient } from "@/lib/auth";

// GET client settings
export async function GET(req: Request) {
  try {
    let { client, isAuthenticated } = await getAuthClient(req, "+vobiz.authToken +geminiApiKey");
    
    if (!isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Self-healing: If no client exists, try to claim orphan or create new one
    if (!client) {
      let userId: string | null = null;
      try {
        const { auth } = await import("@clerk/nextjs/server");
        const authData = await auth();
        userId = authData.userId;
      } catch (e) {}

      if (userId) {
        // Step 1: claim any orphan placeholder document that has no clerkId yet
        const orphan = await Client.findOneAndUpdate(
          { clerkId: { $exists: false }, slug: "solobuild-ai-user" },
          { $set: { clerkId: userId } },
          { new: true }
        ).select("+vobiz.authToken +geminiApiKey");

        if (orphan) {
          client = orphan;
          console.log(`[SETTINGS] Claimed orphan client ${client._id} for clerkId ${userId}`);
        } else {
          // Step 2: no orphan — upsert a new client keyed by clerkId
          const envAuthId = process.env.VOBIZ_AUTH_ID || "";
          const envAuthToken = process.env.VOBIZ_AUTH_TOKEN || "";
          const envPhone = process.env.VOBIZ_PHONE_NUMBER || "";
          const envGeminiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || "";

          client = await Client.findOneAndUpdate(
            { clerkId: userId },
            {
              $setOnInsert: {
                clerkId: userId,
                name: "Solobuild AI User",
                slug: `solobuild-ai-user-${userId.slice(-6)}`,
                email: `${userId.slice(-8)}@placeholder.local`,
                passwordHash: "placeholder_hash_value",
                vobiz: {
                  authId: envAuthId,
                  authToken: envAuthToken,
                  phoneNumber: envPhone,
                  encoding: "audio/x-mulaw",
                  sampleRate: 8000,
                  l16Endian: "le",
                },
                geminiApiKey: envGeminiKey,
              },
            },
            { upsert: true, new: true }
          );
          console.log(`[SETTINGS] Upserted default client: ${client?._id}`);
        }
      } else {
        return NextResponse.json({ error: "Client database entry missing" }, { status: 404 });
      }
    }

    return NextResponse.json(client);
  } catch (error: any) {
    console.error("[SETTINGS GET] Error fetching settings:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

// POST client settings updates
export async function POST(req: Request) {
  try {
    const { client, isAuthenticated } = await getAuthClient(req, "+vobiz.authToken +geminiApiKey");
    if (!isAuthenticated || !client) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { section, ...settings } = body;

    if (section === "General") {
      if (settings.name !== undefined) client.name = settings.name;
      if (settings.timezone !== undefined) client.timezone = settings.timezone;
      if (settings.phone !== undefined) client.phone = settings.phone;
    } else if (section === "Vobiz") {
      if (!client.vobiz) {
        client.vobiz = {
          authId: "",
          authToken: "",
          phoneNumber: "",
        };
      }
      if (settings.authId !== undefined) client.vobiz.authId = settings.authId;
      if (settings.authToken !== undefined) client.vobiz.authToken = settings.authToken;
      if (settings.phoneNumber !== undefined) client.vobiz.phoneNumber = settings.phoneNumber;
      if (settings.webhookSecret !== undefined) client.vobiz.webhookSecret = settings.webhookSecret;
      if (settings.encoding !== undefined) client.vobiz.encoding = settings.encoding;
      if (settings.sampleRate !== undefined) client.vobiz.sampleRate = Number(settings.sampleRate);
      if (settings.l16Endian !== undefined) client.vobiz.l16Endian = settings.l16Endian;
    } else if (section === "Gemini") {
      if (settings.geminiApiKey !== undefined) client.geminiApiKey = settings.geminiApiKey;
    } else {
      // Direct bulk save fallback
      if (settings.name !== undefined) client.name = settings.name;
      if (settings.timezone !== undefined) client.timezone = settings.timezone;
      if (settings.phone !== undefined) client.phone = settings.phone;
      if (settings.vobiz) {
        client.vobiz = {
          ...client.vobiz,
          ...settings.vobiz,
        };
      }
      if (settings.geminiApiKey !== undefined) client.geminiApiKey = settings.geminiApiKey;
    }

    await client.save();
    console.log(`[SETTINGS POST] Saved section ${section || "Bulk"} successfully for client: ${client._id}`);

    // Return the updated client settings (re-fetching with sensitive attributes)
    const updatedClient = await Client.findById(client._id).select("+vobiz.authToken +geminiApiKey");
    return NextResponse.json(updatedClient);
  } catch (error: any) {
    console.error("[SETTINGS POST] Error saving settings:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save settings" },
      { status: 500 }
    );
  }
}
