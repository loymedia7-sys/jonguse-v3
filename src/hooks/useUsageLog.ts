import { useState, useEffect } from 'react';
import { db, auth, isFirebaseAuthenticated } from '../firebase';
import { collection, addDoc, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { UsageLogItem, ToolType } from '../types';

const LOCAL_STORAGE_KEY = 'jong_use_history_v1';

export function useUsageLog() {
  const [logs, setLogs] = useState<UsageLogItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      // 1. First check local storage cache
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        setLogs(JSON.parse(stored));
      }

      // 2. If Firebase Firestore is active and user logged in with Firebase Auth, fetch cloud history
      const user = auth?.currentUser;
      if (db && user && isFirebaseAuthenticated(user)) {
        const q = query(
          collection(db, 'usage_logs'),
          where('userId', '==', user.uid),
          orderBy('timestamp', 'desc'),
          limit(20)
        );
        const snapshot = await getDocs(q);
        const cloudLogs: UsageLogItem[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          cloudLogs.push({
            id: doc.id,
            tool: data.tool,
            title: data.title,
            timestamp: data.timestamp,
            previewUrl: data.previewUrl,
            summary: data.summary,
          });
        });
        if (cloudLogs.length > 0) {
          setLogs(cloudLogs);
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cloudLogs));
        }
      }
    } catch (e) {
      console.warn('History load fallback to localStorage:', e);
    }
  };

  const logActivity = async (tool: ToolType, title: string, summary?: string, previewUrl?: string) => {
    const newItem: UsageLogItem = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      tool,
      title,
      timestamp: Date.now(),
      summary,
      previewUrl,
    };

    setLogs((prev) => {
      const updated = [newItem, ...prev.filter((item) => item.id !== newItem.id)].slice(0, 30);
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      } catch (err) {
        console.warn('Failed to save to localStorage:', err);
      }
      return updated;
    });

    // Write to Firestore only if authenticated with Firebase Auth
    try {
      const user = auth?.currentUser;
      if (db && user && isFirebaseAuthenticated(user)) {
        await addDoc(collection(db, 'usage_logs'), {
          userId: user.uid,
          tool,
          title,
          summary: summary || '',
          previewUrl: previewUrl && previewUrl.length < 50000 ? previewUrl : '', // prevent oversized payload
          timestamp: Date.now(),
        });
      }
    } catch (e) {
      console.warn('Firestore log write notice:', e);
    }
  };

  const clearHistory = () => {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    setLogs([]);
  };

  return { logs, loading, logActivity, clearHistory, refresh: loadLogs };
}
