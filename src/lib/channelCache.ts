// IndexedDB-based cache for large channel data (localStorage has ~5MB limit)
import { Channel } from '@/hooks/useIPTV';

const DB_NAME = 'arabia-iptv-cache';
const DB_VERSION = 1;
const STORE_NAME = 'channels';
const CACHE_KEY = 'main';
const CACHE_MAX_AGE_MS = 2 * 60 * 60 * 1000; // 2 hours

interface CacheEntry {
  key: string;
  channels: Channel[];
  timestamp: number;
  sourceKey?: string;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => {
      console.warn('IndexedDB failed to open:', request.error);
      reject(request.error);
    };
    
    request.onsuccess = () => {
      resolve(request.result);
    };
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };
  });
  
  return dbPromise;
}

export async function getCachedChannels(sourceKey?: string): Promise<Channel[] | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(CACHE_KEY);
      
      request.onsuccess = () => {
        const entry = request.result as CacheEntry | undefined;
        if (entry && entry.channels && Array.isArray(entry.channels)) {
          if (sourceKey && entry.sourceKey !== sourceKey) {
            console.log('IndexedDB cache source mismatch, skipping stale cache');
            resolve(null);
            return;
          }

          const age = Date.now() - entry.timestamp;
          console.log(`Loaded ${entry.channels.length} channels from IndexedDB cache (age: ${Math.round(age / 1000)}s)`);
          resolve(entry.channels);
        } else {
          resolve(null);
        }
      };
      
      request.onerror = () => {
        console.warn('Failed to read from IndexedDB:', request.error);
        resolve(null);
      };
    });
  } catch (e) {
    console.warn('IndexedDB not available, falling back:', e);
    return null;
  }
}

export async function setCachedChannels(channels: Channel[], sourceKey: string = 'default'): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      const entry: CacheEntry = {
        key: CACHE_KEY,
        channels,
        timestamp: Date.now(),
        sourceKey,
      };
      
      const request = store.put(entry);
      
      request.onsuccess = () => {
        console.log(`Cached ${channels.length} channels to IndexedDB`);
        resolve();
      };
      
      request.onerror = () => {
        console.warn('Failed to write to IndexedDB:', request.error);
        reject(request.error);
      };
    });
  } catch (e) {
    console.warn('Failed to cache channels:', e);
  }
}

export async function clearChannelCache(): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(CACHE_KEY);
      
      request.onsuccess = () => {
        console.log('Channel cache cleared');
        resolve();
      };
      
      request.onerror = () => {
        console.warn('Failed to clear cache:', request.error);
        resolve();
      };
    });
  } catch (e) {
    console.warn('Failed to clear cache:', e);
  }
}

// Clear old localStorage cache on load
export function clearLegacyCache(): void {
  try {
    const keysToRemove = [
      'iptv-channels-cache',
      'iptv-channels-cache-timestamp',
      'iptv-channels-cache-v2',
      'iptv-channels-cache-timestamp-v2',
      'iptv-channels-cache-v3',
      'iptv-channels-cache-timestamp-v3',
    ];
    keysToRemove.forEach(key => localStorage.removeItem(key));
    console.log('Cleared legacy localStorage cache');
  } catch (e) {
    // Ignore
  }
}
