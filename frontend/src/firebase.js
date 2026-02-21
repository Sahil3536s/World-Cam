import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Replace these placeholders with your keys from the Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyDyT8Sjc6JtOZEz4HvVR5Xvu0x27aFb1GI",
  authDomain: "worldcam-d787d.firebaseapp.com",
  projectId: "worldcam-d787d",
  storageBucket: "worldcam-d787d.firebasestorage.app",
  messagingSenderId: "632409404000",
  appId: "1:632409404000:web:de42f1e77f7a99c585c905",
  measurementId: "G-5QTKP56HBS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);



export const auth = getAuth(app);
export const db = getFirestore(app);