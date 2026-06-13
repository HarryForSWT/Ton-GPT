import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface TonGPTSchema extends DBSchema {
  vocabulary: {
    key: string;
    value: {
      id: string;
      characters: string;
      pinyin: string;
      meaning: string;
      tone: number;
    };
  };
  progress: {
    key: string;
    value: {
      date: string;
      practicedWords: string[];
    };
  };
}

let dbPromise: Promise<IDBPDatabase<TonGPTSchema>> | null = null;

export async function getDB() {
  if (typeof window === 'undefined') return null; // Only run on client
  if (!dbPromise) {
    dbPromise = openDB<TonGPTSchema>('ton-gpt-db', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('vocabulary')) {
          db.createObjectStore('vocabulary', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('progress')) {
          db.createObjectStore('progress', { keyPath: 'date' });
        }
      },
    });
  }
  return dbPromise;
}
