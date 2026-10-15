import { getAuth, onAuthStateChanged, signInAnonymously } from "firebase/auth";
import type { User } from "firebase/auth";
import { getFirebaseApp } from "@/lib/firebase";

let signInPromise: Promise<User> | null = null;

/**
 * Ensures the visitor has an anonymous Firebase session and returns the user.
 *
 * Anonymous Auth is free on the Spark plan and gives every browser a stable
 * `uid` that persists across reloads. That `uid` becomes the player id, which
 * lets Firestore Security Rules verify identity instead of trusting a
 * client-provided value from the URL.
 *
 * The promise is cached so concurrent callers share the same sign-in.
 */
export function ensureSignedIn(): Promise<User> {
  if (!signInPromise) {
    signInPromise = new Promise<User>((resolve, reject) => {
      const auth = getAuth(getFirebaseApp());
      const unsubscribe = onAuthStateChanged(
        auth,
        (user) => {
          unsubscribe();
          if (user) {
            resolve(user);
          } else {
            signInAnonymously(auth).catch(reject);
          }
        },
        (error) => {
          unsubscribe();
          reject(error);
        }
      );
    }).catch((error) => {
      // Allow a later retry instead of caching a rejected promise forever.
      signInPromise = null;
      throw error;
    });
  }
  return signInPromise;
}
