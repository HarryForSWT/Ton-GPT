import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface Vocabulary {
  id: string;
  hanzi: string;
  pinyin: string;
  pinyinNumber: string;
  germanMeaning: string;
  createdAt: string;
  learned: boolean;
  bestScore: number;
  difficulty: 'easy' | 'medium' | 'hard';
  lastPracticedAt?: string;
  learnedAt?: string;
  teacherAudioId?: string;
  teacherAudioLocalPath?: string;
}

export interface AudioRecording {
  id: string;
  vocabId?: string;
  role: 'student' | 'teacher';
  blob: Blob;
  mimeType: string;
  durationMs: number;
  createdAt: string;
}

interface TonGPTSchema extends DBSchema {
  vocabulary: {
    key: string;
    value: Vocabulary;
  };
  progress: {
    key: string;
    value: {
      date: string;
      practicedWords: string[];
      listeningSessions?: {
        total: number;
        correct: number;
        timestamp: string;
      }[];
    };
  };
  audioRecordings: {
    key: string;
    value: AudioRecording;
    indexes: {
      'by-vocabId': string;
    };
  };
}

/**
 * Konvertiert ein Datum oder einen ISO-String in ein lokales Datum (YYYY-MM-DD)
 * basierend auf der Zeitzone Deutschland (Europe/Berlin).
 */
export function getLocalDateString(dateInput: Date | string = new Date()): string {
  const dateObj = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(dateObj.getTime())) return new Date().toISOString().split('T')[0];
  
  try {
    const formatter = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Europe/Berlin',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(dateObj);
  } catch (e) {
    console.error('Fehler bei Zeitzonen-Konvertierung:', e);
    return dateObj.toISOString().split('T')[0];
  }
}

let dbPromise: Promise<IDBPDatabase<TonGPTSchema>> | null = null;

export async function getDB() {
  if (typeof window === 'undefined') return null;
  if (!dbPromise) {
    dbPromise = openDB<TonGPTSchema>('ton-gpt-db', 2, {
      upgrade(db, oldVersion) {
        // v1 stores
        if (!db.objectStoreNames.contains('vocabulary')) {
          db.createObjectStore('vocabulary', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('progress')) {
          db.createObjectStore('progress', { keyPath: 'date' });
        }
        // v2: audio recordings store
        if (oldVersion < 2 && !db.objectStoreNames.contains('audioRecordings')) {
          const store = db.createObjectStore('audioRecordings', { keyPath: 'id' });
          store.createIndex('by-vocabId', 'vocabId');
        }
      },
    });
  }
  return dbPromise;
}

// ─── Vocabulary CRUD ──────────────────────────────────────────────────────────

export async function getVocabList(): Promise<Vocabulary[]> {
  const db = await getDB();
  if (!db) return [];
  const list = await db.getAll('vocabulary');
  return list.map(item => ({
    ...item,
    learned: !!item.learned,
    difficulty: item.difficulty || 'easy'
  }));
}

export async function getVocabById(id: string): Promise<Vocabulary | undefined> {
  const db = await getDB();
  if (!db) return undefined;
  const item = await db.get('vocabulary', id);
  if (!item) return undefined;
  return {
    ...item,
    learned: !!item.learned,
    difficulty: item.difficulty || 'easy'
  };
}

export async function addVocab(
  vocabData: Omit<Vocabulary, 'id' | 'createdAt' | 'learned' | 'bestScore'> & { id?: string }
): Promise<string> {
  const db = await getDB();
  if (!db) throw new Error('IndexedDB not available');
  const id = vocabData.id || crypto.randomUUID();
  const newVocab: Vocabulary = {
    hanzi: vocabData.hanzi,
    pinyin: vocabData.pinyin,
    pinyinNumber: vocabData.pinyinNumber,
    germanMeaning: vocabData.germanMeaning,
    difficulty: vocabData.difficulty || 'easy',
    id,
    createdAt: new Date().toISOString(),
    learned: false,
    bestScore: 0,
  };
  await db.put('vocabulary', newVocab);
  return id;
}

export async function updateVocab(vocab: Vocabulary): Promise<string> {
  const db = await getDB();
  if (!db) throw new Error('IndexedDB not available');
  await db.put('vocabulary', vocab);
  return vocab.id;
}

export async function deleteVocab(id: string): Promise<void> {
  const db = await getDB();
  if (!db) throw new Error('IndexedDB not available');
  await db.delete('vocabulary', id);
}

/**
 * Löscht eine Vokabel und alle dazugehörigen Audio-Dateien restlos aus IndexedDB.
 */
export async function deleteVocabWithAudio(vocabId: string): Promise<void> {
  const db = await getDB();
  if (!db) throw new Error('IndexedDB not available');

  const audios = await db.getAllFromIndex('audioRecordings', 'by-vocabId', vocabId);
  for (const audio of audios) {
    await db.delete('audioRecordings', audio.id);
  }

  await db.delete('vocabulary', vocabId);
}

export async function toggleLearned(id: string): Promise<Vocabulary> {
  const db = await getDB();
  if (!db) throw new Error('IndexedDB not available');
  const vocab = await db.get('vocabulary', id);
  if (!vocab) throw new Error('Vocabulary not found');

  const updated: Vocabulary = {
    ...vocab,
    learned: !vocab.learned,
    learnedAt: !vocab.learned ? new Date().toISOString() : undefined,
  };
  await db.put('vocabulary', updated);
  return updated;
}

// ─── Audio Recording CRUD ─────────────────────────────────────────────────────

export async function saveAudioRecording(
  data: Omit<AudioRecording, 'id' | 'createdAt'>
): Promise<string> {
  const db = await getDB();
  if (!db) throw new Error('IndexedDB not available');
  const id = crypto.randomUUID();
  const record: AudioRecording = {
    ...data,
    id,
    createdAt: new Date().toISOString(),
  };
  await db.put('audioRecordings', record);
  return id;
}

export async function getAudioRecording(id: string): Promise<AudioRecording | undefined> {
  const db = await getDB();
  if (!db) return undefined;
  return db.get('audioRecordings', id);
}

export async function getAudioRecordingsByVocabId(vocabId: string): Promise<AudioRecording[]> {
  const db = await getDB();
  if (!db) return [];
  return db.getAllFromIndex('audioRecordings', 'by-vocabId', vocabId);
}

export async function deleteAudioRecording(id: string): Promise<void> {
  const db = await getDB();
  if (!db) throw new Error('IndexedDB not available');
  await db.delete('audioRecordings', id);
}

// ─── Learning Calendar & Progress ─────────────────────────────────────────────

export interface DailyActivity {
  added: Vocabulary[];
  learned: Vocabulary[];
  practiced: Vocabulary[];
  listeningSessions?: {
    total: number;
    correct: number;
    timestamp: string;
  }[];
}

/**
 * Registriert eine Übungsaktivität für eine Vokabel am heutigen Tag.
 */
export async function trackPractice(vocabId: string): Promise<void> {
  const db = await getDB();
  if (!db) return;

  // 1. lastPracticedAt der Vokabel aktualisieren
  const vocab = await db.get('vocabulary', vocabId);
  if (vocab) {
    vocab.lastPracticedAt = new Date().toISOString();
    await db.put('vocabulary', vocab);
  }

  // 2. Zum progress Store für das heutige Datum hinzufügen
  const dateStr = getLocalDateString();
  const dayProgress = (await db.get('progress', dateStr)) || {
    date: dateStr,
    practicedWords: [],
  };

  if (!dayProgress.practicedWords.includes(vocabId)) {
    dayProgress.practicedWords.push(vocabId);
    await db.put('progress', dayProgress);
  }
}

/**
 * Speichert das Ergebnis einer Hörübungs-Session für das heutige Datum ab (Europe/Berlin Zeitzone).
 */
export async function saveListeningSessionResult(correct: number, total: number): Promise<void> {
  const db = await getDB();
  if (!db) return;

  const dateStr = getLocalDateString();
  const dayProgress = (await db.get('progress', dateStr)) || {
    date: dateStr,
    practicedWords: [],
  };

  if (!dayProgress.listeningSessions) {
    dayProgress.listeningSessions = [];
  }

  dayProgress.listeningSessions.push({
    total,
    correct,
    timestamp: new Date().toISOString(),
  });

  await db.put('progress', dayProgress);
}

/**
 * Holt alle Aktivitäten (hinzugefügt, gelernt, geübt) gruppiert nach Datum (YYYY-MM-DD).
 */
export async function getCalendarActivities(): Promise<Record<string, DailyActivity>> {
  const db = await getDB();
  if (!db) return {};

  const vocabs = await db.getAll('vocabulary');
  const progress = await db.getAll('progress');

  const activities: Record<string, DailyActivity> = {};

  const getOrCreateDay = (dateStr: string): DailyActivity => {
    if (!activities[dateStr]) {
      activities[dateStr] = { added: [], learned: [], practiced: [] };
    }
    return activities[dateStr];
  };

  // Gruppiere hinzugefügte und gelernte Vokabeln (im Europe/Berlin-Format)
  for (const v of vocabs) {
    if (v.createdAt) {
      const addedDate = getLocalDateString(v.createdAt);
      getOrCreateDay(addedDate).added.push(v);
    }
    if (v.learned && v.learnedAt) {
      const learnedDate = getLocalDateString(v.learnedAt);
      getOrCreateDay(learnedDate).learned.push(v);
    }
  }

  // Gruppiere geübte Vokabeln und Hörübungen aus dem Progress-Store
  const vocabMap = new Map(vocabs.map((v) => [v.id, v]));
  for (const p of progress) {
    const day = getOrCreateDay(p.date);
    for (const id of p.practicedWords) {
      const v = vocabMap.get(id);
      if (v) {
        day.practiced.push(v);
      }
    }
    if (p.listeningSessions) {
      day.listeningSessions = p.listeningSessions;
    }
  }

  return activities;
}

/**
 * Berechnet die aktuelle Anzahl aufeinanderfolgender Lerntage (Streak).
 */
export async function getStreakCount(): Promise<number> {
  const db = await getDB();
  if (!db) return 0;

  const activities = await getCalendarActivities();
  const activeDates = Object.keys(activities).filter((dateStr) => {
    const act = activities[dateStr];
    return (
      act.added.length > 0 ||
      act.learned.length > 0 ||
      act.practiced.length > 0 ||
      (act.listeningSessions && act.listeningSessions.length > 0)
    );
  });

  if (activeDates.length === 0) return 0;

  // Nach Datum absteigend sortieren (neueste zuerst)
  const sortedDates = activeDates.sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  const todayStr = getLocalDateString();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getLocalDateString(yesterday);

  const latestDate = sortedDates[0];

  // Wenn die letzte Aktivität älter als gestern ist, ist die Strähne gerissen
  if (latestDate !== todayStr && latestDate !== yesterdayStr) {
    return 0;
  }

  let streak = 0;
  const currentDate = new Date(latestDate);

  while (true) {
    const currentDateStr = getLocalDateString(currentDate);
    const act = activities[currentDateStr];
    if (
      act &&
      (act.added.length > 0 ||
        act.learned.length > 0 ||
        act.practiced.length > 0 ||
        (act.listeningSessions && act.listeningSessions.length > 0))
    ) {
      streak++;
      // Einen Tag zurückgehen
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}
