import { useState } from "react";

export function useOcr() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recognizeText = async (file: File): Promise<string> => {
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);

      // Request OCR from our backend API route
      const response = await fetch("/api/ocr", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Fehler bei der Texterkennung.");
      }

      const data = await response.json();
      return data.text || "";
    } catch (err) {
      console.error("OCR API request failed:", err);
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
