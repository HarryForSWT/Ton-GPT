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
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    return () => {
      // Clean up Web Audio API resources on unmount
      if (sourceNodeRef.current) {
        try {
          sourceNodeRef.current.onended = null;
          sourceNodeRef.current.stop();
        } catch {
          // Ignore error
        }
      }
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch((err) => console.error("Error closing AudioContext:", err));
      }
    };
  }, []);

  const handlePlay = async () => {
    if (!text.trim()) return;

    if (isPlaying) {
      if (sourceNodeRef.current) {
        try {
          sourceNodeRef.current.onended = null;
          sourceNodeRef.current.stop();
        } catch {
          // Ignore error
        }
        sourceNodeRef.current = null;
      }
      setIsPlaying(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Initialize/Resume AudioContext synchronously within user click event to bypass iOS restriction
      const AudioContextClass = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) {
        throw new Error("Web Audio API wird von diesem Browser nicht unterstützt.");
      }

      const ctx = new AudioContextClass();
      audioContextRef.current = ctx;
      if (ctx.state === "suspended") {
        await ctx.resume();
      }

      // 2. Fetch the audio file (check Cache Storage first, fallback to network)
      const audioUrl = `/api/tts?text=${encodeURIComponent(text.trim())}`;
      let arrayBuffer: ArrayBuffer;

      let cache: Cache | undefined;
      let cachedResponse: Response | undefined;
      try {
        if (typeof window !== "undefined" && "caches" in window) {
          cache = await caches.open("gemini-tts-cache");
          cachedResponse = await cache.match(audioUrl);
        }
      } catch (cacheErr) {
        console.warn("Cache match failed, using network:", cacheErr);
      }

      if (cachedResponse) {
        arrayBuffer = await cachedResponse.arrayBuffer();
      } else {
        const response = await fetch(audioUrl);
        if (!response.ok) {
          throw new Error(`HTTP-Fehler! Status: ${response.status}`);
        }

        if (cache) {
          try {
            await cache.put(audioUrl, response.clone());
          } catch (cachePutErr) {
            console.warn("Failed to write to cache:", cachePutErr);
          }
        }
        arrayBuffer = await response.arrayBuffer();
      }

      // 3. Decode the WAV/MP3 file
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

      // 4. Create and play the source node
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);

      source.onended = () => {
        setIsPlaying(false);
      };

      sourceNodeRef.current = source;
      setIsPlaying(true);
      setLoading(false);
      source.start(0);

    } catch (err) {
      console.error("Web Audio playback failed:", err);
      setError("Audio konnte nicht geladen werden.");
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
