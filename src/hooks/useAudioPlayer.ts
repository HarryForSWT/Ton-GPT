"use client";

import { useState, useRef, useCallback, useEffect } from 'react';

export type PlayerState = 'idle' | 'loading' | 'playing' | 'paused' | 'ended' | 'error';

export interface UseAudioPlayerResult {
  state: PlayerState;
  durationMs: number;
  currentMs: number;
  error: string | null;
  load: (blob: Blob, mimeType?: string) => void;
  play: () => void;
  pause: () => void;
  seek: (ms: number) => void;
  reset: () => void;
}

export function useAudioPlayer(): UseAudioPlayerResult {
  const [state, setState] = useState<PlayerState>('idle');
  const [durationMs, setDurationMs] = useState(0);
  const [currentMs, setCurrentMs] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const rafRef = useRef<number | null>(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      cleanUp();
    };
  }, []);

  const cleanUp = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  };

  const trackPosition = useCallback(() => {
    if (audioRef.current && !audioRef.current.paused) {
      setCurrentMs(audioRef.current.currentTime * 1000);
      rafRef.current = requestAnimationFrame(trackPosition);
    }
  }, []);

  const load = useCallback((blob: Blob, mimeType?: string) => {
    cleanUp();
    setError(null);
    setState('loading');
    setCurrentMs(0);
    setDurationMs(0);

    try {
      console.log('Audio blob loaded:', blob.size, 'bytes, type:', blob.type, 'fallback mimeType:', mimeType);
      
      let finalType = mimeType || blob.type || 'audio/webm';
      if (finalType.includes('octet-stream') || finalType.includes('x-www-form-urlencoded')) {
        finalType = 'audio/webm';
      }
      
      let finalBlob = blob;
      // Only recreate/wrap the blob if the type is generic/missing (like octet-stream)
      // If it's already a valid audio/ type, keep it exactly as is to avoid metadata stripping.
      const isGenericType = !blob.type || blob.type.includes('octet-stream') || blob.type.includes('x-www-form-urlencoded');
      if (isGenericType && finalType && finalType !== blob.type) {
        finalBlob = new Blob([blob], { type: finalType });
      }

      const url = URL.createObjectURL(finalBlob);
      objectUrlRef.current = url;

      const audio = new Audio();
      audioRef.current = audio;

      // Set preload to 'auto' so Chrome fully loads the blob in memory, avoiding range request decoding issues
      audio.preload = 'auto';
      audio.src = url;

      audio.onloadedmetadata = () => {
        const dur = isFinite(audio.duration) ? audio.duration * 1000 : 0;
        setDurationMs(dur);
        setState('paused');
      };

      audio.onended = () => {
        setState('ended');
        setCurrentMs(durationMs);
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
      };

      audio.onerror = () => {
        const errObj = audio.error;
        const errMsg = `HTMLAudioElement error details: Code=${errObj?.code || 'unbekannt'}, Message="${errObj?.message || 'keine'}", BlobSize=${finalBlob.size}, BlobType="${finalBlob.type}", URL="${url}"`;
        console.error(errMsg);
        setError(`Audio konnte nicht geladen werden (Code: ${errObj?.code || 'unbekannt'}).`);
        setState('error');
      };

    } catch (err) {
      console.error('Error loading audio:', err);
      setError('Audio konnte nicht geladen werden.');
      setState('error');
    }
  }, [durationMs]);

  const play = useCallback(() => {
    if (!audioRef.current) return;

    const audio = audioRef.current;

    // If ended, restart from beginning
    if (state === 'ended') {
      audio.currentTime = 0;
      setCurrentMs(0);
    }

    audio.play().then(() => {
      setState('playing');
      rafRef.current = requestAnimationFrame(trackPosition);
    }).catch((err) => {
      console.error('Playback error:', err);
      setError('Wiedergabe fehlgeschlagen.');
      setState('error');
    });
  }, [state, trackPosition]);

  const pause = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setCurrentMs(audioRef.current.currentTime * 1000);
    setState('paused');
  }, []);

  const seek = useCallback((ms: number) => {
    if (!audioRef.current) return;
    const seconds = ms / 1000;
    audioRef.current.currentTime = seconds;
    setCurrentMs(ms);
  }, []);

  const reset = useCallback(() => {
    cleanUp();
    setState('idle');
    setCurrentMs(0);
    setDurationMs(0);
    setError(null);
  }, []);

  return {
    state,
    durationMs,
    currentMs,
    error,
    load,
    play,
    pause,
    seek,
    reset,
  };
}
