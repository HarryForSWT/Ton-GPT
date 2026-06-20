import { useState } from "react";

export function useOcr() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recognizeText = async (file: File): Promise<string> => {
    setLoading(true);
    setError(null);
    try {
      // Dynamic import to prevent SSR errors in Next.js
      const { createWorker } = await import("tesseract.js");
      
      // Initialize the worker with both Simplified and Traditional Chinese
      const worker = await createWorker(["chi_sim", "chi_tra"]);
      
      // Perform OCR
      const { data: { text } } = await worker.recognize(file);
      
      // Terminate the worker to release browser memory and resources
      await worker.terminate();

      // Clean up whitespace (especially important for Chinese characters)
      const cleanText = text.replace(/\s+/g, "").trim();
      return cleanText;
    } catch (err) {
      console.error("OCR recognition error:", err);
      const errMsg = err instanceof Error ? err.message : "Texterkennung fehlgeschlagen.";
      setError(errMsg);
      throw new Error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    recognizeText,
  };
}
