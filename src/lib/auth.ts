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
 *
 * Important: when there is no existing session, `onAuthStateChanged` fires once
 * with `null` and we unsubscribe. Because of that, we MUST resolve with the
 * user returned by `signInAnonymously` (the listener will not fire again).
 */
export function ensureSignedIn(): Promise<User> {
  if (signInPromise) return signInPromise;

  console.log("[tuti:auth] ensureSignedIn() → iniciando");

  signInPromise = new Promise<User>((resolve, reject) => {
    const auth = getAuth(getFirebaseApp());
    let settled = false;

    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        if (settled) return;
        settled = true;
        unsubscribe();

        if (user) {
          console.log("[tuti:auth] sesión existente → uid:", user.uid);
          resolve(user);
          return;
        }

        console.log("[tuti:auth] sin sesión previa → signInAnonymously()…");
        signInAnonymously(auth)
          .then((credential) => {
            console.log(
              "[tuti:auth] sesión anónima creada → uid:",
              credential.user.uid
            );
            resolve(credential.user);
          })
          .catch((error) => {
            console.error(
              "[tuti:auth] signInAnonymously() falló (¿Anonymous Auth habilitado en Firebase?):",
              error
            );
            reject(error);
          });
      },
      (error) => {
        if (settled) return;
        settled = true;
        console.error("[tuti:auth] onAuthStateChanged() error:", error);
        unsubscribe();
        reject(error);
      }
    );
  }).catch((error) => {
    // Allow a later retry instead of caching a rejected promise forever.
    signInPromise = null;
    throw error;
  });

  return signInPromise;
}
