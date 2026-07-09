import { NextResponse } from "next/server";

export async function GET(req: Request) {
  return handleFinished(req);
}

export async function POST(req: Request) {
  return handleFinished(req);
}

async function handleFinished(req: Request) {
  console.log("[RECORDING] finished callback received");
  return new NextResponse("<Response></Response>", {
    headers: { "Content-Type": "application/xml" },
  });
}
