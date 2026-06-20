"use client";

import { useState, useRef, useCallback, useEffect } from 'react';

export type RecorderState = 'idle' | 'requesting' | 'recording' | 'stopped' | 'error';

export interface UseAudioRecorderResult {
  state: RecorderState;
  durationMs: number;
  audioBlob: Blob | null;
  mimeType: string;
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  cancelRecording: () => void;
  reset: () => void;
}

function isSafariOrIOS(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isSafari = ua.includes('Safari') && !ua.includes('Chrome') && !ua.includes('Chromium');
  return isIOS || isSafari;
}

/**
 * Detect the best supported MIME type for audio recording.
 * - Android Chrome: audio/webm;codecs=opus
 * - iPhone Safari: audio/mp4
 * - Fallback: audio/webm or empty string (browser decides)
 */
function getBestMimeType(): string {
  if (typeof window === 'undefined' || !window.MediaRecorder) return '';

  const isApple = isSafariOrIOS();

  const types = isApple
    ? [
        'audio/mp4',
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/ogg',
      ]
    : [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg;codecs=opus',
        'audio/ogg',
      ];

  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return '';
}

export function useAudioRecorder(): UseAudioRecorderResult {
  const [state, setState] = useState<RecorderState>('idle');
  const [durationMs, setDurationMs] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [mimeType] = useState<string>(() => getBestMimeType());
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  // Clean up stream and timer on unmount
  useEffect(() => {
    return () => {
      stopStream();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const startRecording = useCallback(async () => {
    if (typeof window === 'undefined') return;

    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Audio-Aufnahme wird von diesem Browser nicht unterstützt.');
      setState('error');
      return;
    }

    setError(null);
    setState('requesting');
    chunksRef.current = [];

    try {
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      const isApple = isSafariOrIOS();

      // On mobile devices and Safari, disabling voice processing features triggers hardware-level
      // audio session glitches, sample rate mismatches, and severe choppiness.
      // Keeping them enabled leverages the hardware's native audio pipelines, providing a clean stream.
      const useVoiceProcessing = isMobile || isApple;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: useVoiceProcessing
          ? {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            }
          : {
              echoCancellation: false,
              noiseSuppression: false,
              autoGainControl: false,
            },
      });

      streamRef.current = stream;

      const options: MediaRecorderOptions = {};
      if (mimeType) options.mimeType = mimeType;

      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const finalMime = mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: finalMime });
        
        stopStream();
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }

        // Ein reiner WebM Header hat ca. 70-150 Bytes. Alles unter 500 Bytes enthält definitiv kein Audio.
        if (blob.size < 500) {
          setError('Aufnahme fehlgeschlagen (Hardware-Treiber blockiert Ton). Bitte überprüfe dein Windows-Mikrofon.');
          setState('error');
          setAudioBlob(null);
        } else {
          setAudioBlob(blob);
          setState('stopped');
        }
      };

      recorder.onerror = () => {
        setError('Aufnahme fehlgeschlagen. Bitte versuche es erneut.');
        setState('error');
        stopStream();
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };

      // Start recording the entire audio in one single chunk (more reliable, prevents incomplete headers)
      recorder.start();
      startTimeRef.current = Date.now();
      setState('recording');

      // Live duration counter
      timerRef.current = setInterval(() => {
        setDurationMs(Date.now() - startTimeRef.current);
      }, 100);

    } catch (err) {
      let errorName = "";
      if (err instanceof DOMException || err instanceof Error) {
        errorName = err.name;
      }

      if (errorName === "NotAllowedError" || errorName === "PermissionDeniedError") {
        setError("Mikrofonzugriff verweigert. Bitte erlaube den Zugriff in den Browser- und Systemeinstellungen.");
      } else if (errorName === "NotFoundError" || errorName === "DevicesNotFoundError") {
        setError("Kein Mikrofon gefunden. Bitte schließe ein Mikrofon an oder verwende ein Gerät mit integriertem Mikrofon (z. B. einen Laptop).");
      } else if (errorName === "NotReadableError" || errorName === "TrackStartError") {
        setError("Das Mikrofon wird bereits von einer anderen Anwendung verwendet oder ist blockiert.");
      } else {
        setError("Mikrofon konnte nicht aktiviert werden. Stelle sicher, dass ein funktionsfähiges Mikrofon angeschlossen ist.");
      }
      setState("error");
    }
  }, [mimeType]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, [state]);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && state === 'recording') {
      // Override onstop to discard the blob
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }
    stopStream();
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    chunksRef.current = [];
    setAudioBlob(null);
    setDurationMs(0);
    setState('idle');
    setError(null);
  }, [state]);

  const reset = useCallback(() => {
    setAudioBlob(null);
    setDurationMs(0);
    setState('idle');
    setError(null);
    chunksRef.current = [];
  }, []);

  return {
    state,
    durationMs,
    audioBlob,
    mimeType,
    error,
    startRecording,
    stopRecording,
    cancelRecording,
    reset,
  };
}
