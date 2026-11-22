/**
 * Инициализация Firebase и сервис рисования в реальном времени.
 *
 * Используется Firestore (коллекция `rooms/{roomId}/strokes`) + анонимная
 * аутентификация. Каждый штрих — документ с массивом точек, цветом, толщиной
 * и идентификатором отправителя. Подписка onSnapshot доставляет новые штрихи
 * на оба устройства в реальном времени.
 */
import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, signInAnonymously, type Auth } from 'firebase/auth';
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy,
  getDocs,
  deleteDoc,
  doc,
  type Firestore,
  type Unsubscribe,
} from 'firebase/firestore';

import { firebaseConfig, isFirebaseConfigured } from '../config/firebaseConfig.js';

export interface Point {
  x: number;
  y: number;
}

export interface Stroke {
  id: string;
  points: Point[];
  color: string;
  width: number;
  senderId: string;
  createdAt: number;
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

export async function initFirebase(): Promise<boolean> {
  if (!isFirebaseConfigured()) {
    return false;
  }
  if (app) {
    return true;
  }
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    await signInAnonymously(auth);
    return true;
  } catch (error) {
    console.error('Firebase init failed:', error);
    return false;
  }
}

export function getCurrentUserId(): string | null {
  return auth?.currentUser?.uid ?? null;
}

export function getRoomId(): string {
  const stored = localStorage.getItem('love-letter:draw:room');
  if (stored && stored.trim() !== '') {
    return stored.trim();
  }
  const code = Math.random().toString(36).slice(2, 8).toUpperCase();
  localStorage.setItem('love-letter:draw:room', code);
  return code;
}

export function setRoomId(code: string): void {
  localStorage.setItem('love-letter:draw:room', code.trim().toUpperCase());
}

export function subscribeToStrokes(
  roomId: string,
  onStroke: (stroke: Stroke) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  if (!db) {
    onError?.(new Error('Firestore не инициализирован.'));
    return () => {};
  }
  const ref = collection(db, 'rooms', roomId, 'strokes');
  const q = query(ref, orderBy('createdAt', 'asc'));
  return onSnapshot(
    q,
    (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data() as {
            points?: Point[];
            color?: string;
            width?: number;
            senderId?: string;
            createdAt?: { toMillis?: () => number } | number;
          };
          const createdAt =
            typeof data.createdAt === 'number'
              ? data.createdAt
              : data.createdAt?.toMillis?.() ?? Date.now();
          onStroke({
            id: change.doc.id,
            points: Array.isArray(data.points) ? data.points : [],
            color: typeof data.color === 'string' ? data.color : '#000000',
            width: typeof data.width === 'number' ? data.width : 2,
            senderId: typeof data.senderId === 'string' ? data.senderId : '',
            createdAt,
          });
        }
      });
    },
    (error) => {
      onError?.(error as Error);
    },
  );
}

export async function sendStroke(
  roomId: string,
  stroke: { points: Point[]; color: string; width: number },
): Promise<void> {
  if (!db || !auth?.currentUser) {
    throw new Error('Firestore/auth не готовы.');
  }
  const ref = collection(db, 'rooms', roomId, 'strokes');
  await addDoc(ref, {
    points: stroke.points,
    color: stroke.color,
    width: stroke.width,
    senderId: auth.currentUser.uid,
    createdAt: serverTimestamp(),
  });
}

export async function clearRoom(roomId: string): Promise<void> {
  if (!db) return;
  const ref = collection(db, 'rooms', roomId, 'strokes');
  const snapshot = await getDocs(ref);
  await Promise.all(snapshot.docs.map((d) => deleteDoc(doc(db!, 'rooms', roomId, 'strokes', d.id))));
}