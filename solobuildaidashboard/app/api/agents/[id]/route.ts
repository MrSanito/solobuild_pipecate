import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Agent, Client } from "@/lib/models";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    
    let client = await Client.findOne({ email: "contact@solobuildai.com" });
    if (!client) {
      client = await Client.findOne();
    }
    
    if (!client) {
      return NextResponse.json({ error: "No client found" }, { status: 400 });
    }

    const resolvedParams = await params;
    const id = resolvedParams.id;
    
    if (!id || id.length !== 24) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }

    const deleted = await Agent.findOneAndDelete({ _id: id, clientId: client._id });
    if (!deleted) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to delete agent:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
