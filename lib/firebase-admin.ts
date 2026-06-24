import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

function firebasePrivateKey() {
  const key = process.env.FIREBASE_PRIVATE_KEY;
  return key ? key.replace(/\\n/g, "\n") : "";
}

export function isFirebaseConfigured() {
  return Boolean(
    process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      firebasePrivateKey() &&
      process.env.FIREBASE_STORAGE_BUCKET
  );
}

export function useFirebaseBackend() {
  if (process.env.NODE_ENV === "test" || process.env.VITEST === "true") {
    return false;
  }

  const preference = process.env.CONTENTSEAL_STORAGE_BACKEND?.toLowerCase();
  if (preference === "sqlite") {
    return false;
  }
  if (preference === "firebase") {
    return isFirebaseConfigured();
  }

  return Boolean(process.env.VERCEL && isFirebaseConfigured());
}

function firebaseApp() {
  const existing = getApps()[0];
  if (existing) {
    return existing;
  }

  if (!isFirebaseConfigured()) {
    throw new Error("Firebase backend is not configured.");
  }

  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: firebasePrivateKey()
    }),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET
  });
}

export function firebaseServices() {
  const app = firebaseApp();
  return {
    firestore: getFirestore(app),
    bucket: getStorage(app).bucket(process.env.FIREBASE_STORAGE_BUCKET)
  };
}
