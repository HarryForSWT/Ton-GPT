"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Trash2 } from "lucide-react";
import { AudioRecorder } from "./AudioRecorder";
import { AudioPlayer } from "./AudioPlayer";
import { saveAudioRecording, getAudioRecordingsByVocabId, deleteAudioRecording, AudioRecording, trackPractice } from "@/lib/db";
import { de } from "@/locales/de";

interface AudioControlsProps {
  /** The vocabulary word ID this recording belongs to (optional) */
  vocabId?: string;
  /** 'student' for the student's own pronunciation, 'teacher' for reference recordings */
  role: "student" | "teacher";
  /** Optional label shown at the top of the section */
  label?: string;
  /** Callback triggered when a new recording is successfully saved */
  onRecordingSaved?: () => void;
  /** If true, the recording button (recorder) is hidden */
  hideRecorder?: boolean;
}

export function AudioControls({ vocabId, role, label, onRecordingSaved, hideRecorder = false }: AudioControlsProps) {
  const t = de.audio;
  const [savedRecordings, setSavedRecordings] = useState<AudioRecording[]>([]);
  const [mounted, setMounted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);

  // Load existing recordings from IndexedDB on mount
  useEffect(() => {
    setMounted(true);
    if (vocabId) {
      getAudioRecordingsByVocabId(vocabId).then((data) => {
        setSavedRecordings(data.filter((r) => r.role === role));
      });
    }
  }, [vocabId, role]);

  const handleRecordingComplete = useCallback(async (blob: Blob, mimeType: string, durationMs: number) => {
    setSaving(true);
    try {
      await saveAudioRecording({
        vocabId,
        role,
        blob,
        mimeType,
        durationMs,
      });

      // Als Übung im Kalender tracken (nur für Schüler)
      if (vocabId && role === "student") {
        await trackPractice(vocabId);
      }

      // Reload from DB
      if (vocabId) {
        const updated = await getAudioRecordingsByVocabId(vocabId);
        setSavedRecordings(updated.filter((r) => r.role === role));
      }

      setSavedMsg(true);
      if (onRecordingSaved) {
        onRecordingSaved();
      }
      setTimeout(() => setSavedMsg(false), 2500);
    } catch (err) {
      console.error("Failed to save recording:", err);
    } finally {
      setSaving(false);
    }
  }, [vocabId, role, onRecordingSaved]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm(t.deleteConfirm)) return;
    try {
      await deleteAudioRecording(id);
      setSavedRecordings((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error("Failed to delete recording:", err);
    }
  }, [t.deleteConfirm]);

  if (!mounted) return null;

  return (
    <div className="space-y-4">
      {label && (
        <h3 className="text-sm font-bold text-neutral-300 uppercase tracking-wider">{label}</h3>
      )}

      {/* Recorder */}
      {!hideRecorder && (
        <AudioRecorder onRecordingComplete={handleRecordingComplete} />
      )}

      {/* Save feedback */}
      {saving && (
        <p className="text-xs text-neutral-400 text-center animate-pulse">{t.savedLocally}...</p>
      )}
      {savedMsg && (
        <p className="text-xs text-emerald-400 text-center font-semibold animate-in fade-in">
          ✓ {t.savedSuccess}
        </p>
      )}

      {/* Saved recordings list */}
      {savedRecordings.length > 0 ? (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
            Gespeicherte Aufnahmen ({savedRecordings.length})
          </p>
          {savedRecordings.map((recording, index) => (
            <div key={recording.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-500">
                  Aufnahme {index + 1} — {new Date(recording.createdAt).toLocaleDateString("de-DE")}
                </span>
                <button
                  onClick={() => handleDelete(recording.id)}
                  className="p-1.5 text-neutral-600 hover:text-red-400 hover:bg-neutral-800 rounded-lg transition-all"
                  title={t.deleteRecordingBtn}
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <AudioPlayer
                blob={recording.blob}
                mimeType={recording.mimeType}
              />
            </div>
          ))}
        </div>
      ) : (
        hideRecorder && (
          <p className="text-xs text-neutral-500 text-center py-2.5 italic">
            Keine Referenzaufnahme vorhanden
          </p>
        )
      )}
    </div>
  );
}
