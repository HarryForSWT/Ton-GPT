"use client";

import React, { useEffect } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { de } from "@/locales/de";

interface AudioPlayerProps {
  blob: Blob;
  mimeType?: string;
  /** Optional label shown above the player */
  label?: string;
}

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

export function AudioPlayer({ blob, mimeType, label }: AudioPlayerProps) {
  const t = de.audio;
  const { state, durationMs, currentMs, error, load, play, pause, seek, reset } = useAudioPlayer();

  // Load blob whenever it changes
  useEffect(() => {
    if (blob) {
      load(blob, mimeType);
    }
    return () => {
      reset();
    };
  }, [blob, mimeType]); // eslint-disable-line react-hooks/exhaustive-deps

  const isPlaying = state === "playing";
  const isEnded = state === "ended";
  const isLoading = state === "loading" || state === "idle";

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    seek(Number(e.target.value));
  };

  return (
    <div className="bg-neutral-950/60 border border-neutral-800 rounded-2xl p-4 space-y-3">
      {label && (
        <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">{label}</p>
      )}

      {error ? (
        <p className="text-red-400 text-xs">{error}</p>
      ) : (
        <>
          {/* Controls row */}
          <div className="flex items-center gap-3">
            {/* Play / Pause / Replay button */}
            <button
              onClick={isPlaying ? pause : play}
              disabled={isLoading}
              className={`
                w-10 h-10 rounded-full flex items-center justify-center transition-all shrink-0
                ${isLoading
                  ? "bg-neutral-800 text-neutral-600 cursor-not-allowed"
                  : "bg-emerald-500 hover:bg-emerald-600 active:scale-90 text-white shadow-lg shadow-emerald-500/20"
                }
              `}
              title={isPlaying ? t.pauseBtn : t.playBtn}
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-neutral-500 border-t-white rounded-full animate-spin" />
              ) : isEnded ? (
                <RotateCcw size={16} />
              ) : isPlaying ? (
                <Pause size={16} fill="white" />
              ) : (
                <Play size={16} fill="white" />
              )}
            </button>

            {/* Progress bar + timestamps */}
            <div className="flex-1 space-y-1">
              <input
                type="range"
                min={0}
                max={durationMs || 100}
                value={currentMs}
                onChange={handleSeek}
                disabled={isLoading || durationMs === 0}
                className="w-full h-1.5 bg-neutral-700 rounded-full appearance-none cursor-pointer accent-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
              />
              <div className="flex justify-between text-xs text-neutral-500 font-mono">
                <span>{formatTime(currentMs)}</span>
                <span>{formatTime(durationMs)}</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
