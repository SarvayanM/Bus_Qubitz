import { initializeApp } from "firebase/app";
import { initializeAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBZ9gmNKdQDCwyTq07PI-t0kZBEK8Oaiw4",
  authDomain: "bus-qubitz.firebaseapp.com",
  projectId: "bus-qubitz",
  storageBucket: "bus-qubitz.firebasestorage.app",
  messagingSenderId: "59933164275",
  appId: "1:59933164275:web:f49a6ac10dde16595aad86",
};

const app = initializeApp(firebaseConfig);
const auth = initializeAuth(app);
export const db = getFirestore(app);

export default auth;
