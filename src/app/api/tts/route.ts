import { NextRequest, NextResponse } from "next/server";

// Helper function to append a WAV header to raw PCM 16-bit 24kHz mono audio
function pcmToWav(pcmBuffer: Buffer, sampleRate: number = 24000): Buffer {
  const wavHeader = Buffer.alloc(44);
  
  // "RIFF" chunk descriptor
  wavHeader.write("RIFF", 0);
  // File size - 8 bytes
  wavHeader.writeUInt32LE(36 + pcmBuffer.length, 4);
  // "WAVE" format description
  wavHeader.write("WAVE", 8);
  
  // "fmt " subchunk
  wavHeader.write("fmt ", 12);
  // Subchunk size (16 for PCM)
  wavHeader.writeUInt32LE(16, 16);
  // Audio format (1 = raw uncompressed PCM)
  wavHeader.writeUInt16LE(1, 20);
  // Channel count (1 = mono)
  wavHeader.writeUInt16LE(1, 22);
  // Sample rate (24000 Hz)
  wavHeader.writeUInt32LE(sampleRate, 24);
  // Byte rate = sampleRate * channelCount * bytesPerSample (24000 * 1 * 2 = 48000)
  wavHeader.writeUInt32LE(sampleRate * 1 * 2, 28);
  // Block align = channelCount * bytesPerSample (1 * 2 = 2)
  wavHeader.writeUInt16LE(2, 32);
  // Bits per sample (16 bits)
  wavHeader.writeUInt16LE(16, 34);
  
  // "data" subchunk
  wavHeader.write("data", 36);
  // Data chunk size in bytes
  wavHeader.writeUInt32LE(pcmBuffer.length, 40);
  
  return Buffer.concat([wavHeader, pcmBuffer]);
}

// Helper function to fetch Google Translate TTS as a fallback
async function fetchGoogleTranslateTts(text: string): Promise<NextResponse | null> {
  try {
    console.log(`[TTS] Falling back to Google Translate for: "${text}"`);
    const fallbackUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=zh-CN&client=tw-ob&q=${encodeURIComponent(text.trim())}`;
    const response = await fetch(fallbackUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      },
    });

    if (!response.ok) {
      console.error("[TTS] Google Translate fallback failed status:", response.status);
      return null;
    }

    const buffer = await response.arrayBuffer();
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    console.error("[TTS] Google Translate fallback exception:", err);
    return null;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const text = searchParams.get("text");
  
  if (!text) {
    return NextResponse.json({ error: "Text-Parameter fehlt." }, { status: 400 });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("[TTS] GEMINI_API_KEY is not configured on the server. Trying Google Translate fallback.");
      const fallback = await fetchGoogleTranslateTts(text);
      if (fallback) return fallback;
      return NextResponse.json(
        { error: "GEMINI_API_KEY ist auf dem Server nicht konfiguriert und Fallback schlug fehl." },
        { status: 500 }
      );
    }

    // Call Google Gemini 3.1 Flash TTS model
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-tts-preview:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `Lies dieses chinesische Wort laut und deutlich auf Mandarin vor: ${text}`
              }
            ]
          }
        ],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                // Prebuilt voices: Aoede, Puck, Charon, Kore, Fenrir.
                // Aoede is female, very clear and suitable for educational pronunciations.
                voiceName: "Aoede"
              }
            }
          }
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn(`[TTS] Gemini API failed with status ${response.status} (${errText}). Trying Google Translate fallback.`);
      const fallback = await fetchGoogleTranslateTts(text);
      if (fallback) return fallback;
      
      return NextResponse.json(
        { error: "Fehler bei der Kommunikation mit dem Aussprache-Dienst." },
        { status: 502 }
      );
    }

    interface GeminiPart {
      text?: string;
      inlineData?: {
        mimeType: string;
        data: string;
      };
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    const audioPart = candidate?.content?.parts?.find(
      (p: GeminiPart) => p.inlineData
    );

    if (!audioPart || !audioPart.inlineData || !audioPart.inlineData.data) {
      console.warn("[TTS] No audio data returned from Gemini TTS API. Trying Google Translate fallback.", data);
      const fallback = await fetchGoogleTranslateTts(text);
      if (fallback) return fallback;

      return NextResponse.json(
        { error: "Keine Audio-Daten empfangen." },
        { status: 502 }
      );
    }

    const base64Data = audioPart.inlineData.data;
    const pcmBuffer = Buffer.from(base64Data, "base64");
    
    // Add WAV header (Gemini TTS returns PCM 16-bit 24kHz mono)
    const wavBuffer = pcmToWav(pcmBuffer, 24000);

    // Serve the WAV file with strong Cache-Control headers
    return new NextResponse(new Uint8Array(wavBuffer), {
      headers: {
        "Content-Type": "audio/wav",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("[TTS] API Route Exception, falling back to Google Translate:", error);
    const fallback = await fetchGoogleTranslateTts(text);
    if (fallback) return fallback;

    return NextResponse.json({ error: "Interner Serverfehler." }, { status: 500 });
  }
}
