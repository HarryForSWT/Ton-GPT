"use client";

import React, { useState, useEffect, useRef } from "react";
import { Volume2, AlertTriangle, Square, Loader2 } from "lucide-react";

interface MandarinTTSPlayerProps {
  text: string;
  pinyin?: string;
  className?: string;
}

export function MandarinTTSPlayer({ text, className = "" }: MandarinTTSPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Clean up audio playback on unmount
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handlePlay = async () => {
    if (!text.trim()) return;

    if (isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setIsPlaying(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (!audioRef.current) {
        const audioUrl = `/api/tts?text=${encodeURIComponent(text.trim())}`;
        const audio = new Audio(audioUrl);
        
        audio.onplay = () => {
          setLoading(false);
          setIsPlaying(true);
        };

        audio.onended = () => {
          setIsPlaying(false);
        };

        audio.onerror = () => {
          setLoading(false);
          setError("Audio konnte nicht geladen werden.");
          setIsPlaying(false);
        };

        audioRef.current = audio;
        
        // Play immediately synchronously to bypass iOS Safari autoplay blocking
        audio.play().catch((err) => {
          console.error("Audio playback failed:", err);
          setError("Wiedergabe vom Browser blockiert.");
          setIsPlaying(false);
          setLoading(false);
        });
      } else {
        setLoading(false);
        audioRef.current.play().catch((err) => {
          console.error("Audio playback failed:", err);
          setError("Wiedergabe fehlgeschlagen.");
          setIsPlaying(false);
        });
      }

    } catch (err) {
      console.error("Error setting up audio:", err);
      setError("Verbindungsfehler beim Aussprache-Dienst.");
      setLoading(false);
      setIsPlaying(false);
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <button
          type="button"
          onClick={handlePlay}
          disabled={loading}
          className={`flex items-center justify-center gap-2 py-3 px-5 rounded-2xl font-bold text-sm transition-all active:scale-95 shadow-md cursor-pointer ${
            isPlaying
              ? "bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30"
              : "bg-emerald-500/10 border border-emerald-500/25 hover:bg-emerald-500/20 text-emerald-400 shadow-emerald-500/5"
          } ${loading ? "opacity-60 cursor-not-allowed" : ""}`}
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin text-emerald-400" />
              <span>Lade Gemini-Stimme...</span>
            </>
          ) : isPlaying ? (
            <>
              <Square size={16} className="fill-current" />
              <span>Stoppen</span>
            </>
          ) : (
            <>
              <Volume2 size={16} />
              <span>Vorlesen lassen (Gemini Voice)</span>
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-xl flex gap-2.5 items-start text-xs text-red-300">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
          <p>{error}</p>
        </div>
      )}
    </div>
  );
}
