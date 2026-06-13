import React from 'react';
import { Mic, Square } from 'lucide-react';

interface AudioRecorderProps {
  onRecordingComplete?: (blob: Blob) => void;
  isRecording?: boolean;
}

export function AudioRecorder({ isRecording = false }: AudioRecorderProps) {
  return (
    <div className="flex flex-col items-center justify-center p-6 bg-neutral-900 border border-neutral-800 rounded-3xl">
      <div className={`w-24 h-24 rounded-full flex items-center justify-center transition-colors ${
        isRecording ? 'bg-red-500/20 text-red-500 animate-pulse' : 'bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30 cursor-pointer'
      }`}>
        {isRecording ? <Square size={40} /> : <Mic size={40} />}
      </div>
      <p className="mt-4 text-neutral-400 font-medium">
        {isRecording ? 'Recording in progress...' : 'Tap to start recording'}
      </p>
    </div>
  );
}
