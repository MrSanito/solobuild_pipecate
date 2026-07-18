import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Client } from "@/lib/models";
import bcrypt from "bcryptjs";
import { signToken } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    await dbConnect();

    // Fetch the client with sensitive fields explicitly selected
    const client = await Client.findOne({ email }).select("+passwordHash +vobiz.authToken +geminiApiKey");
    
    if (!client) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, client.passwordHash);
    if (!isMatch) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    // Generate JWT token
    const token = await signToken({
      id: client._id.toString(),
      email: client.email,
      name: client.name,
    });

    // Don't send sensitive info back to the client
    const clientSafe = {
      _id: client._id,
      name: client.name,
      email: client.email,
      slug: client.slug,
      plan: client.plan,
    };

    return NextResponse.json({ success: true, client: clientSafe, token });
  } catch (error: any) {
    console.error("[LOGIN] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to log in" },
      { status: 500 }
    );
  }
}
