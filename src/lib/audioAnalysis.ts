/**
 * Client-seitige Audio-Analyse für chinesischen Tonverlauf und Aussprache-Vergleich.
 */

export interface AnalysisResult {
  score: number;        // Gesamtbewertung (0 - 100)
  pitchScore: number;   // Tonverlauf-Bewertung (0 - 100)
  durationScore: number;// Silbenlängen-Bewertung (0 - 100)
  rhythmScore: number;  // Rhythmus/Pausen-Bewertung (0 - 100)
  studentPitch: number[]; // Normalisierte Tonhöhenkurve Schüler (Länge 50)
  teacherPitch: number[]; // Normalisierte Tonhöhenkurve Lehrer (Länge 50)
  pitchFeedback: string;
  durationFeedback: string;
  rhythmFeedback: string;
}

/**
 * Hilfsfunktion zur Tonhöhenerkennung mittels Autokorrelation.
 * Gibt die Grundfrequenz (F0) in Hertz zurück (0 bei Stille/Rauschen).
 */
function detectPitchAutocorrelation(signal: Float32Array, sampleRate: number): number {
  const SIZE = signal.length;
  let rms = 0;

  // Root Mean Square (RMS) berechnen, um Stille zu erkennen
  for (let i = 0; i < SIZE; i++) {
    rms += signal[i] * signal[i];
  }
  rms = Math.sqrt(rms / SIZE);

  // Wenn das Signal zu leise ist (Schwelle 0.015), ist es Stille
  if (rms < 0.015) {
    return 0;
  }

  // Autokorrelation berechnen
  const r = new Float32Array(SIZE);
  for (let lag = 0; lag < SIZE / 2; lag++) {
    let sum = 0;
    for (let i = 0; i < SIZE / 2; i++) {
      sum += signal[i] * signal[i + lag];
    }
    r[lag] = sum;
  }

  // Ersten Nulldurchgang finden (Ausschließen von Störfrequenzen)
  let firstZeroCrossing = -1;
  for (let i = 0; i < SIZE / 2 - 1; i++) {
    if (r[i] > 0 && r[i + 1] <= 0) {
      firstZeroCrossing = i;
      break;
    }
  }

  if (firstZeroCrossing === -1) {
    return 0; // Kein Ton gefunden
  }

  // Maximum-Peak nach dem Nulldurchgang suchen
  let maxVal = -1;
  let maxPos = -1;
  for (let i = firstZeroCrossing; i < SIZE / 2; i++) {
    if (r[i] > maxVal) {
      maxVal = r[i];
      maxPos = i;
    }
  }

  if (maxPos !== -1) {
    const frequency = sampleRate / maxPos;
    // Frequenzbereich menschliche Stimme einschränken (50Hz - 800Hz)
    if (frequency >= 50 && frequency <= 800) {
      return frequency;
    }
  }

  return 0;
}

/**
 * Füllt Lücken im Pitch-Track (z. B. stimmlose Konsonanten) durch lineare Interpolation.
 */
function fillZeroGaps(track: number[]): number[] {
  const filled = [...track];
  let lastVal = 0;

  // Anfangsnullen mit dem ersten echten Wert füllen
  for (let i = 0; i < filled.length; i++) {
    if (filled[i] > 0) {
      if (lastVal === 0) {
        for (let j = 0; j < i; j++) filled[j] = filled[i];
      }
      lastVal = filled[i];
    }
  }

  // Mittlere Lücken und End-Nullen interpolieren bzw. auffüllen
  for (let i = 0; i < filled.length; i++) {
    if (filled[i] === 0) {
      let nextNonZeroIndex = -1;
      for (let j = i + 1; j < filled.length; j++) {
        if (filled[j] > 0) {
          nextNonZeroIndex = j;
          break;
        }
      }

      if (nextNonZeroIndex !== -1) {
        const step = (filled[nextNonZeroIndex] - lastVal) / (nextNonZeroIndex - (i - 1));
        for (let j = i; j < nextNonZeroIndex; j++) {
          filled[j] = lastVal + step * (j - (i - 1));
        }
        i = nextNonZeroIndex - 1;
      } else {
        // Bis zum Ende auffüllen
        for (let j = i; j < filled.length; j++) {
          filled[j] = lastVal;
        }
        break;
      }
    } else {
      lastVal = filled[i];
    }
  }

  return filled;
}

/**
 * Glättet ein Signal mit einem 3-Punkt Medianfilter (entfernt isolierte Ausreißer).
 */
function smoothTrack(track: number[]): number[] {
  const smoothed = [...track];
  for (let i = 1; i < track.length - 1; i++) {
    const vals = [track[i - 1], track[i], track[i + 1]].sort((a, b) => a - b);
    smoothed[i] = vals[1]; // Median
  }
  return smoothed;
}

/**
 * Resampelt einen Pitch-Track auf eine feste Länge.
 */
function resample(track: number[], targetLength: number): number[] {
  const resampled: number[] = [];
  for (let i = 0; i < targetLength; i++) {
    const percent = i / (targetLength - 1);
    const index = percent * (track.length - 1);
    const low = Math.floor(index);
    const high = Math.ceil(index);
    const weight = index - low;

    const val = track[low] * (1 - weight) + track[high] * weight;
    resampled.push(val);
  }
  return resampled;
}

/**
 * Normalisiert einen Pitch-Track mittels Z-Score (Mittelwert = 0, Standardabweichung = 1).
 * Dies eliminiert Unterschiede in der Stimmlage (z.B. hohe/tiefe Stimmen).
 * minStdDev verhindert das extreme Verstärken von Rauschen bei flachen Tönen (z.B. Ton 1).
 */
function normalizeZScore(track: number[], minStdDev: number = 0): number[] {
  let sum = 0;
  for (const val of track) sum += val;
  const mean = sum / track.length;

  let varianceSum = 0;
  for (const val of track) varianceSum += (val - mean) * (val - mean);
  const stdDevRaw = Math.sqrt(varianceSum / track.length);
  const stdDev = Math.max(stdDevRaw, minStdDev) || 1;

  return track.map((val) => (val - mean) / stdDev);
}

/**
 * Extrahiert den reinen Sprach-Pitch-Track aus einem AudioBuffer.
 */
function extractSpeechPitchTrack(audioBuffer: AudioBuffer): {
  pitchTrack: number[];
  activeDurationMs: number;
  totalDurationMs: number;
  silenceRatio: number;
} {
  const sampleRate = audioBuffer.sampleRate;
  const channelData = audioBuffer.getChannelData(0);
  
  const frameSize = 1024;
  const hopSize = 512;
  
  const rawPitches: number[] = [];
  
  // Analyse in Frames aufteilen
  for (let offset = 0; offset + frameSize < channelData.length; offset += hopSize) {
    const frame = channelData.subarray(offset, offset + frameSize);
    const pitch = detectPitchAutocorrelation(frame, sampleRate);
    rawPitches.push(pitch);
  }

  const totalDurationMs = audioBuffer.duration * 1000;

  // Sprachgrenzen finden (wo F0 > 0)
  let firstSpeechIndex = -1;
  let lastSpeechIndex = -1;
  let activeFramesCount = 0;

  for (let i = 0; i < rawPitches.length; i++) {
    if (rawPitches[i] > 0) {
      if (firstSpeechIndex === -1) firstSpeechIndex = i;
      lastSpeechIndex = i;
      activeFramesCount++;
    }
  }

  // Wenn keine Stimme erkannt wurde
  if (firstSpeechIndex === -1 || activeFramesCount < 3) {
    return {
      pitchTrack: new Array(50).fill(0),
      activeDurationMs: 0,
      totalDurationMs,
      silenceRatio: 1.0
    };
  }

  // Nur den aktiven Sprechabschnitt ausschneiden
  const activeSegment = rawPitches.slice(firstSpeechIndex, lastSpeechIndex + 1);
  const activeDurationMs = (activeSegment.length * hopSize / sampleRate) * 1000;
  
  // Lücken füllen und glätten
  const filledSegment = fillZeroGaps(activeSegment);
  const smoothedSegment = smoothTrack(filledSegment);
  
  // Resampeln auf feste Länge (50 Bins)
  const normalizedLengthTrack = resample(smoothedSegment, 50);

  // Berechne die Stille-Quote ausschließlich innerhalb des aktiven Sprechsegments (also ohne Randstille)
  let activeSilenceCount = 0;
  for (let i = firstSpeechIndex; i <= lastSpeechIndex; i++) {
    if (rawPitches[i] === 0) {
      activeSilenceCount++;
    }
  }
  const activeSegmentLength = lastSpeechIndex - firstSpeechIndex + 1;
  const silenceRatio = activeSegmentLength > 0 ? (activeSilenceCount / activeSegmentLength) : 0;

  return {
    pitchTrack: normalizedLengthTrack,
    activeDurationMs,
    totalDurationMs,
    silenceRatio
  };
}

/**
 * Analysiert und vergleicht das Schüler-Audio mit dem Lehrer-Audio auf Client-Seite.
 */
export async function analyzeAndCompare(
  studentBlob: Blob,
  teacherBlob: Blob
): Promise<AnalysisResult> {
  if (typeof window === "undefined") {
    throw new Error("Audio-Analyse kann nur im Browser ausgeführt werden.");
  }

  const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const audioCtx = new AudioContextClass();

  // 1. Audio-Dateien laden und decodieren
  const [studentArrayBuffer, teacherArrayBuffer] = await Promise.all([
    studentBlob.arrayBuffer(),
    teacherBlob.arrayBuffer(),
  ]);

  const [studentAudioBuffer, teacherAudioBuffer] = await Promise.all([
    audioCtx.decodeAudioData(studentArrayBuffer),
    audioCtx.decodeAudioData(teacherArrayBuffer),
  ]);

  // 2. Features extrahieren
  const studentFeatures = extractSpeechPitchTrack(studentAudioBuffer);
  const teacherFeatures = extractSpeechPitchTrack(teacherAudioBuffer);

  // Prüfen, ob überhaupt Sprache erkannt wurde
  if (studentFeatures.activeDurationMs === 0) {
    throw new Error("Es konnte keine Sprache im Schüler-Audio erkannt werden. Bitte lauter sprechen!");
  }

  // 3. Pitch Z-Score normalisieren. Wir limitieren minStdDev auf 15.0 Hz,
  // um Rauschen bei sehr flachen Tonlagen nicht künstlich aufzublähen.
  const studentNormPitch = normalizeZScore(studentFeatures.pitchTrack, 15.0);
  const teacherNormPitch = normalizeZScore(teacherFeatures.pitchTrack, 15.0);

  // 4. Scores berechnen

  // A. Tonverlauf (Pitch Shape Similarity)
  // Mittleren absoluten Abstand (MAE) berechnen
  let totalDiff = 0;
  for (let i = 0; i < 50; i++) {
    totalDiff += Math.abs(studentNormPitch[i] - teacherNormPitch[i]);
  }
  const mae = totalDiff / 50;
  
  // MAE auf 0 - 100 mappen (Abweichung von 2.5 gilt als 0% Score)
  const pitchScore = Math.max(0, Math.min(100, Math.round(100 * (1 - mae / 2.5))));

  // B. Silbenlänge (Duration Similarity)
  const durationRatio = Math.min(studentFeatures.activeDurationMs, teacherFeatures.activeDurationMs) /
                        Math.max(studentFeatures.activeDurationMs, teacherFeatures.activeDurationMs);
  const durationScore = Math.round(durationRatio * 100);

  // C. Rhythmus / Pausen (Silence Ratio Similarity)
  const rhythmDiff = Math.abs(studentFeatures.silenceRatio - teacherFeatures.silenceRatio);
  const rhythmScore = Math.max(0, Math.round(100 * (1 - rhythmDiff)));

  // D. Gesamtbewertung (Pitch hat die höchste Priorität für chinesische Töne: 60%)
  const score = Math.round(pitchScore * 0.6 + durationScore * 0.2 + rhythmScore * 0.2);

  // 5. Feedback-Generierung
  let pitchFeedback = "";
  if (pitchScore >= 85) {
    pitchFeedback = "Hervorragender Tonverlauf! Deine Melodiekurve stimmt exzellent mit der des Lehrers überein.";
  } else if (pitchScore >= 67) {
    pitchFeedback = "Guter Tonverlauf. Die grundlegende Richtung deines Tons stimmt schon gut, versuche noch die Tonhöhe präziser zu halten.";
  } else {
    pitchFeedback = "Der Tonverlauf weicht ab. Achte darauf, ob der Ton steigen, fallen, flach bleiben oder erst abfallen und dann steigen muss.";
  }

  let durationFeedback = "";
  if (durationScore >= 80) {
    durationFeedback = "Perfektes Sprechtempo und Silbenlänge.";
  } else if (studentFeatures.activeDurationMs > teacherFeatures.activeDurationMs) {
    durationFeedback = "Du hast das Wort etwas zu langsam gesprochen (zu stark gedehnt).";
  } else {
    durationFeedback = "Du hast das Wort etwas zu schnell gesprochen.";
  }

  let rhythmFeedback = "";
  if (rhythmScore >= 80) {
    rhythmFeedback = "Sehr natürlicher Sprechrhythmus.";
  } else {
    rhythmFeedback = "Achte auf einen gleichmäßigeren Redefluss und natürlichere Pausen.";
  }

  // Audio-Context schließen, um Ressourcen freizugeben
  await audioCtx.close();

  return {
    score,
    pitchScore,
    durationScore,
    rhythmScore,
    studentPitch: studentNormPitch,
    teacherPitch: teacherNormPitch,
    pitchFeedback,
    durationFeedback,
    rhythmFeedback
  };
}

export function getTonesFromPinyin(pinyinNumber: string, pinyin: string): number[] {
  // Versuche Ziffern aus pinyinNumber zu extrahieren
  const digits = pinyinNumber.match(/[1-5]/g);
  if (digits && digits.length > 0) {
    return digits.map(d => parseInt(d, 10));
  }

  // Fallback: Akzente in pinyin analysieren
  const syllables = pinyin.split(/\s+/);
  const tones: number[] = [];

  const tone1 = /[āēīōūǖĀĒĪŌŪǕ]/;
  const tone2 = /[áéíóúǘÁÉÍÓÚǗ]/;
  const tone3 = /[ǎěǐǒǔǚǍĚǏǑǓǙ]/;
  const tone4 = /[àèìòùǜÀÈÌÒÙǛ]/;

  for (const syl of syllables) {
    if (!syl.trim()) continue;
    if (tone1.test(syl)) {
      tones.push(1);
    } else if (tone2.test(syl)) {
      tones.push(2);
    } else if (tone3.test(syl)) {
      tones.push(3);
    } else if (tone4.test(syl)) {
      tones.push(4);
    } else {
      tones.push(5); // Neutraler Ton
    }
  }

  return tones.length > 0 ? tones : [1];
}

function generateSyntheticPitchContour(tones: number[]): number[] {
  const totalPoints = 50;
  const contour: number[] = [];
  const N = tones.length;

  for (let s = 0; s < N; s++) {
    const tone = tones[s];
    const startIdx = Math.floor((s / N) * totalPoints);
    const endIdx = Math.floor(((s + 1) / N) * totalPoints);
    const len = endIdx - startIdx;

    for (let i = 0; i < len; i++) {
      const t = i / (len - 1 || 1); // Normalisiert auf [0, 1]
      let val = 0;

      if (tone === 1) {
        val = 1.0; // Hoch-flach
      } else if (tone === 2) {
        val = -0.6 + t * 1.4; // Steigend
      } else if (tone === 3) {
        // Fallend-steigend (Dipp)
        val = 4.8 * (t - 0.45) * (t - 0.45) - 1.0;
      } else if (tone === 4) {
        val = 1.0 - t * 2.2; // Fallend
      } else {
        // Neutraler Ton (leicht fallend)
        val = -0.2 - t * 0.6;
      }
      contour.push(val);
    }
  }

  while (contour.length < totalPoints) {
    contour.push(contour[contour.length - 1] || 0);
  }
  if (contour.length > totalPoints) {
    contour.splice(totalPoints);
  }

  return contour;
}

function smoothMovingAverage(track: number[], windowSize: number = 7): number[] {
  const result = [...track];
  const half = Math.floor(windowSize / 2);
  for (let i = 0; i < track.length; i++) {
    let sum = 0;
    let count = 0;
    for (let w = -half; w <= half; w++) {
      const idx = i + w;
      if (idx >= 0 && idx < track.length) {
        sum += track[idx];
        count++;
      }
    }
    result[i] = sum / count;
  }
  return result;
}

export async function analyzeAndCompareWithTTS(
  studentBlob: Blob,
  pinyinNumber: string,
  pinyin: string
): Promise<AnalysisResult> {
  if (typeof window === "undefined") {
    throw new Error("Audio-Analyse kann nur im Browser ausgeführt werden.");
  }

  const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const audioCtx = new AudioContextClass();

  // 1. Student-Audio decodieren
  const studentArrayBuffer = await studentBlob.arrayBuffer();
  const studentAudioBuffer = await audioCtx.decodeAudioData(studentArrayBuffer);

  // 2. Student Features extrahieren
  const studentFeatures = extractSpeechPitchTrack(studentAudioBuffer);

  if (studentFeatures.activeDurationMs === 0) {
    throw new Error("Es konnte keine Sprache im Schüler-Audio erkannt werden. Bitte lauter sprechen!");
  }

  // 3. Töne bestimmen und künstliche Referenz erzeugen
  const tones = getTonesFromPinyin(pinyinNumber, pinyin);
  const rawSyntheticPitch = generateSyntheticPitchContour(tones);
  // Mit gleitendem Durchschnitt glätten, um Kanten abzurunden und Übergänge natürlicher zu machen
  const syntheticPitch = smoothMovingAverage(rawSyntheticPitch, 7);

  // 4. Normalisieren.
  // Für die menschliche Stimme begrenzen wir minStdDev auf 15.0 Hz.
  // Für die synthetische Kurve begrenzen wir minStdDev auf 0.15 (dimensionslos).
  const studentNormPitch = normalizeZScore(studentFeatures.pitchTrack, 15.0);
  const teacherNormPitch = normalizeZScore(syntheticPitch, 0.15);

  // 5. Scores berechnen
  // A. Tonverlauf (Pitch-Abweichung)
  let totalDiff = 0;
  for (let i = 0; i < 50; i++) {
    totalDiff += Math.abs(studentNormPitch[i] - teacherNormPitch[i]);
  }
  const mae = totalDiff / 50;
  // Toleranz bei Synthese (Faktor 3.0), um falsche Töne zuverlässig als Fehler zu erkennen, während korrekte Töne bestehen
  const pitchScore = Math.max(0, Math.min(100, Math.round(100 * (1 - mae / 3.0))));

  // B. Silbenlänge (Sprechdauer) - toleranter Bereich: 200ms bis 550ms pro Silbe
  const minTargetDuration = tones.length * 200;
  const maxTargetDuration = tones.length * 550;
  const actualDuration = studentFeatures.activeDurationMs;
  let durationScore = 100;
  
  if (actualDuration < minTargetDuration) {
    durationScore = Math.round((actualDuration / minTargetDuration) * 100);
  } else if (actualDuration > maxTargetDuration) {
    durationScore = Math.round((maxTargetDuration / actualDuration) * 100);
  }
  durationScore = Math.max(50, durationScore); // Mindestpunktzahl 50, solange gesprochen wurde

  // C. Rhythmus / Pause (Vergleich mit einer Zielpausenquote von 10% innerhalb des Sprechsegments)
  const rhythmDiff = Math.abs(studentFeatures.silenceRatio - 0.1);
  const rhythmScore = Math.max(0, Math.round(100 * (1 - rhythmDiff * 1.5)));

  // D. Gesamtbewertung (Chinesischer Tonverlauf hat höchste Priorität bei Synthese: 80%)
  const score = Math.round(pitchScore * 0.8 + durationScore * 0.10 + rhythmScore * 0.10);

  // 6. Feedback generieren
  let pitchFeedback = "";
  if (pitchScore >= 85) {
    pitchFeedback = "Hervorragender Tonverlauf! Deine Melodiekurve stimmt perfekt mit den Standardtönen überein.";
  } else if (pitchScore >= 67) {
    pitchFeedback = "Guter Tonverlauf. Die Tonrichtung stimmt weitgehend, versuche den Verlauf noch etwas präziser zu halten.";
  } else {
    pitchFeedback = "Der Tonverlauf weicht ab. Achte genau auf die vier Pinyin-Töne (hoch-flach, steigend, fallend-steigend, fallend).";
  }

  let durationFeedback = "";
  if (durationScore >= 80) {
    durationFeedback = "Sehr gutes Sprechtempo.";
  } else if (studentFeatures.activeDurationMs > maxTargetDuration) {
    durationFeedback = "Du hast das Wort etwas zu langsam oder gedehnt gesprochen.";
  } else {
    durationFeedback = "Du hast das Wort sehr schnell oder abgehackt gesprochen.";
  }

  let rhythmFeedback = "";
  if (rhythmScore >= 80) {
    rhythmFeedback = "Natürlicher Sprechrhythmus.";
  } else {
    rhythmFeedback = "Achte auf einen gleichmäßigeren Redefluss.";
  }

  await audioCtx.close();

  return {
    score,
    pitchScore,
    durationScore,
    rhythmScore,
    studentPitch: studentNormPitch,
    teacherPitch: teacherNormPitch,
    pitchFeedback,
    durationFeedback,
    rhythmFeedback
  };
}
