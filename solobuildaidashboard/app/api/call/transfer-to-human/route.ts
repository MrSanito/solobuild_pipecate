import { NextResponse } from "next/server";

export async function GET(req: Request) {
  return handleTransfer(req);
}

export async function POST(req: Request) {
  return handleTransfer(req);
}

async function handleTransfer(req: Request) {
  const agentNumber = process.env.TRANSFER_AGENT_NUMBER || "";
  console.log(`[TRANSFER] Initiating human transfer routing to: ${agentNumber}`);
  const transferXml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Speak voice="WOMAN" language="en-US">
        Please hold while I transfer you to a human agent.
    </Speak>
    <Dial>${agentNumber}</Dial>
</Response>`;
  return new NextResponse(transferXml, {
    headers: { "Content-Type": "application/xml" },
  });
}
