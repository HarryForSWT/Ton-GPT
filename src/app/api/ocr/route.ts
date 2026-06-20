import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY ist auf dem Server nicht konfiguriert." },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "Keine Bilddatei erhalten." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64Data = buffer.toString("base64");
    const mimeType = file.type || "image/jpeg";

    // Call the official Gemini API directly over HTTP POST
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: "Du bist ein präzises OCR-System für Chinesisch-Lernende. Analysiere das Bild und extrahiere alle erkennbaren chinesischen Schriftzeichen (Hanzi). Gib AUSSCHLIESSLICH die chinesischen Schriftzeichen zurück. Füge keine Satzzeichen, kein Pinyin, keine deutsche Übersetzung, keine Formatierungen (wie Markdown-Codeblöcke) und keinerlei erklärenden Begleittext hinzu (z. B. nicht 'Die Schriftzeichen sind:'). Wenn keine chinesischen Schriftzeichen gefunden werden können, antworte mit einer leeren Antwort."
                },
                {
                  inlineData: {
                    mimeType: mimeType,
                    data: base64Data,
                  },
                },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error status:", response.status, errorText);
      return NextResponse.json(
        { error: "Fehler beim Abrufen der Antwort von Gemini." },
        { status: 502 }
      );
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    // Clean up whitespace/newlines to return a clean Hanzi string
    const cleanText = text.replace(/\s+/g, "").trim();

    return NextResponse.json({ text: cleanText });
  } catch (error) {
    console.error("OCR API Route Exception:", error);
    return NextResponse.json({ error: "Interner Serverfehler." }, { status: 500 });
  }
}
