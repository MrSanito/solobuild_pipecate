import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Client } from "@/lib/models";
import { verifyToken } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const decoded = await verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    await dbConnect();
    const client = await Client.findOne({ email: decoded.email });

    if (!client) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const clientSafe = {
      _id: client._id,
      name: client.name,
      email: client.email,
      slug: client.slug,
      plan: client.plan,
    };

    return NextResponse.json({ success: true, client: clientSafe });
  } catch (error: any) {
    console.error("[AUTH_ME] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to authenticate" },
      { status: 500 }
    );
  }
}
