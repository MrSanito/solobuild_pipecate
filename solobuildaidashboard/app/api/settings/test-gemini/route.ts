import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { apiKey } = await req.json();
    if (!apiKey) {
      return NextResponse.json({ error: "Missing API Key" }, { status: 400 });
    }

    // Call Gemini API models or perform a tiny test call
    const testUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(testUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: "Respond with only the word 'OK'.",
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json({ error: `Gemini API returned error: ${errText}` }, { status: response.status });
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (text) {
      return NextResponse.json({ success: true, message: "Gemini API key is valid and active!" });
    } else {
      return NextResponse.json({ error: "Gemini API returned an empty or invalid response format." }, { status: 500 });
    }
  } catch (error: any) {
    console.error("[TEST GEMINI] Error testing key:", error);
    return NextResponse.json(
      { error: error.message || "Failed to connect to Gemini API" },
      { status: 500 }
    );
  }
}
