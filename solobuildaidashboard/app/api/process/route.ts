import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  console.log("-----------------------------------------");
  console.log("request received from upstash");

  // Log headers
  const headersObj: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    headersObj[key] = value;
  });
  console.log("Request Headers:", headersObj);

  try {
    const body = await req.json();
    console.log("Request Body:", body);
    console.log("-----------------------------------------");
    return NextResponse.json({ success: true, received: true, body });
  } catch (error) {
    try {
      const text = await req.text();
      console.log("Request Text Body:", text);
      console.log("-----------------------------------------");
      return NextResponse.json({ success: true, received: true, body: text });
    } catch (e: any) {
      console.error("Failed to parse request body:", e);
      console.log("-----------------------------------------");
      return NextResponse.json({ success: false, error: e.message }, { status: 400 });
    }
  }
}
