// Optional maintenance script: deletes rooms that have been inactive for more
// than STALE_MS. Firestore has no TTL for whole documents on the Spark plan and
// Cloud Functions require the paid Blaze plan, so this runs for free from a
// scheduled GitHub Actions workflow (see .github/workflows/cleanup-rooms.yml).
//
// Requires the `firebase-admin` package (devDependency) and credentials:
//   - FIREBASE_SERVICE_ACCOUNT  → JSON string of a service account key, or
//   - GOOGLE_APPLICATION_CREDENTIALS → path to a service account JSON file.
//
// Usage:
//   node scripts/cleanup-stale-rooms.mjs

import { applicationDefault, cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const STALE_MS = 24 * 60 * 60 * 1000; // 24 hours

function initApp() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (raw) {
    return initializeApp({ credential: cert(JSON.parse(raw)) });
  }
  return initializeApp({ credential: applicationDefault() });
}

async function main() {
  initApp();
  const db = getFirestore();
  const cutoff = Date.now() - STALE_MS;

  const stale = await db
    .collection("rooms")
    .where("lastActivity", "<", cutoff)
    .get();

  if (stale.empty) {
    console.log("No stale rooms found.");
    return;
  }

  for (const roomDoc of stale.docs) {
    // recursiveDelete removes the room document and its subcollections
    // (players, rounds and their responses).
    await db.recursiveDelete(roomDoc.ref);
    console.log(`Deleted stale room ${roomDoc.id}`);
  }

  console.log(`Deleted ${stale.size} stale room(s).`);
}

main().catch((error) => {
  console.error("Cleanup failed:", error);
  process.exit(1);
});
