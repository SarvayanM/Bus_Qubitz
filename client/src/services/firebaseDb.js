// src/services/firebaseDb.js
import { getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

// Use your initialized Firebase app (you already have firebaseAuth)
const app = getApp();
const db = getFirestore(app);

/**
 * Upsert a user's role record into Firestore.
 * Collection: users/{uid}
 */
export async function upsertUserRole({ uid, phone, role = "passenger" }) {
  if (!uid) throw new Error("upsertUserRole: uid is required");
  const ref = doc(db, "users", uid);
  await setDoc(
    ref,
    {
      uid,
      phone: phone || "",
      role, // "passenger" | "admin" | etc.
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(), // set on first write; overwritten by Firestore on first merge
    },
    { merge: true }
  );
  return { uid, role };
}

/**
 * Read a user's role. Returns { uid, role } or null.
 */
export async function getUserRole(uid) {
  if (!uid) return null;
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data();
  return { uid: data.uid, role: data.role || "passenger" };
}
