"use client";

import React from "react";
import { Mic, Square, RotateCcw, X } from "lucide-react";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { de } from "@/locales/de";

interface AudioRecorderProps {
  /** Called when a recording is complete and ready */
  onRecordingComplete?: (blob: Blob, mimeType: string, durationMs: number) => void;
  /** Called when user cancels an in-progress recording */
  onCancel?: () => void;
}

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

export function AudioRecorder({ onRecordingComplete, onCancel }: AudioRecorderProps) {
  const t = de.audio;
  const { state, durationMs, audioBlob, mimeType, error, startRecording, stopRecording, cancelRecording, reset } = useAudioRecorder();

  const isIdle = state === "idle";
  const isRequesting = state === "requesting";
  const isRecording = state === "recording";
  const isStopped = state === "stopped";
  const isError = state === "error";

  const handleStop = () => {
    stopRecording();
    // The blob is set asynchronously in the hook after MediaRecorder.onstop fires
  };

  const handleSave = () => {
    if (audioBlob && onRecordingComplete) {
      onRecordingComplete(audioBlob, mimeType || "audio/webm", durationMs);
    }
  };

  const handleReRecord = () => {
    reset();
  };

  const handleCancel = () => {
    cancelRecording();
    onCancel?.();
  };

  return (
    <div className="bg-neutral-950/60 border border-neutral-800 rounded-2xl p-5 space-y-4">

      {/* Error state */}
      {isError && (
        <div className="p-3 bg-red-950/40 border border-red-800/60 text-red-300 rounded-xl text-sm">
          {error || "Aufnahme fehlgeschlagen."}
        </div>
      )}

      {/* Central mic button */}
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          {/* Pulsing ring while recording */}
          {isRecording && (
            <>
              <span className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
              <span className="absolute inset-0 rounded-full bg-red-500/10 animate-pulse" />
            </>
          )}

          <button
            onClick={isRecording ? handleStop : isIdle || isError ? startRecording : undefined}
            disabled={isRequesting || isStopped}
            className={`
              relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-200
              ${isRecording
                ? "bg-red-500 hover:bg-red-600 active:scale-90 shadow-xl shadow-red-500/30"
                : isRequesting
                  ? "bg-neutral-800 cursor-not-allowed"
                  : isStopped
                    ? "bg-neutral-700 cursor-default"
                    : "bg-emerald-500 hover:bg-emerald-600 active:scale-90 shadow-xl shadow-emerald-500/30"
              }
            `}
            title={isRecording ? t.stopBtn : t.recordBtn}
          >
            {isRequesting ? (
              <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
            ) : isRecording ? (
              <Square size={28} fill="white" className="text-white" />
            ) : (
              <Mic size={30} className="text-white" />
            )}
          </button>
        </div>

        {/* Status label + timer */}
        <div className="text-center">
          {isIdle && (
            <p className="text-neutral-400 text-sm">{t.tapToRecord}</p>
          )}
          {isRequesting && (
            <p className="text-neutral-400 text-sm animate-pulse">{t.requestingLabel}</p>
          )}
          {isRecording && (
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-red-400 text-sm font-medium">{t.recordingLabel}</span>
              </div>
              <span className="text-white text-2xl font-mono font-bold tabular-nums">
                {formatDuration(durationMs)}
              </span>
            </div>
          )}
          {isStopped && audioBlob && (
            <p className="text-emerald-400 text-sm font-medium">{t.recordingComplete}</p>
          )}
          {isError && (
            <button
              onClick={() => reset()}
              className="text-neutral-400 hover:text-white text-sm underline underline-offset-2 transition-colors"
            >
              Erneut versuchen
            </button>
          )}
        </div>
      </div>

      {/* Action buttons — visible after recording is stopped */}
      {isStopped && audioBlob && (
        <div className="flex gap-3">
          <button
            onClick={handleReRecord}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-300 rounded-xl text-sm font-medium transition-all active:scale-95"
          >
            <RotateCcw size={15} />
            {t.reRecordBtn}
          </button>
          <button
            onClick={handleSave}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-bold transition-all active:scale-95 shadow-lg shadow-emerald-500/20"
          >
            {t.saveRecording}
          </button>
        </div>
      )}

      {/* Cancel button — visible while recording */}
      {(isRecording || isRequesting) && (
        <button
          onClick={handleCancel}
          className="w-full flex items-center justify-center gap-2 py-2 text-neutral-500 hover:text-neutral-300 text-sm transition-colors"
        >
          <X size={14} />
          {t.cancelBtn}
        </button>
      )}
    </div>
  );
}
