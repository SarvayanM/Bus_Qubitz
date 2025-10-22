import { initializeApp } from "firebase/app";
import { initializeAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA-3SzRk4Fj93ugvrcBAW_id_dxgJ-ELV0",
  authDomain: "bookmybus-6e1ed.firebaseapp.com",
  projectId: "bookmybus-6e1ed",
  storageBucket: "bookmybus-6e1ed.firebasestorage.app",
  messagingSenderId: "651487949053",
  appId: "1:651487949053:web:1d634bcb01897c61208e94",
};

const app = initializeApp(firebaseConfig);
const auth = initializeAuth(app);
export const db = getFirestore(app);

export default auth;
