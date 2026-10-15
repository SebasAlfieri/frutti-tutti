import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Log once, at module load, whether the public Firebase config is present. A
// missing value is the most common cause of "nothing happens": the app loads
// but every Firebase call fails.
const MISSING_CONFIG = (
  [
    ["NEXT_PUBLIC_FIREBASE_API_KEY", firebaseConfig.apiKey],
    ["NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", firebaseConfig.authDomain],
    ["NEXT_PUBLIC_FIREBASE_PROJECT_ID", firebaseConfig.projectId],
    ["NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET", firebaseConfig.storageBucket],
    ["NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID", firebaseConfig.messagingSenderId],
    ["NEXT_PUBLIC_FIREBASE_APP_ID", firebaseConfig.appId]
  ] as const
)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (MISSING_CONFIG.length > 0) {
  console.error(
    "[tuti:firebase] Faltan variables de entorno:",
    MISSING_CONFIG.join(", "),
    "→ revisá .env.local (local) o las Environment Variables (Vercel)."
  );
} else if (typeof window !== "undefined") {
  console.log(
    "[tuti:firebase] Configuración presente → projectId:",
    firebaseConfig.projectId
  );
}

let db: Firestore | undefined;

/**
 * Returns the shared Firebase app, initializing it on first use.
 */
export function getFirebaseApp(): FirebaseApp {
  if (getApps().length > 0) return getApp();

  console.log("[tuti:firebase] initializeApp()");
  return initializeApp(firebaseConfig);
}

/**
 * Returns the shared Firestore instance, initializing it on first use.
 */
export function getDb(): Firestore {
  if (!db) {
    db = getFirestore(getFirebaseApp());
  }
  return db;
}
