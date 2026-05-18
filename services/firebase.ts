
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCDzoaU5BjXfjIAbCls0nP_ps081D3bnho",
  authDomain: "lesson-p-g.firebaseapp.com",
  projectId: "lesson-p-g",
  storageBucket: "lesson-p-g.firebasestorage.app",
  messagingSenderId: "529105073913",
  appId: "1:529105073913:web:54a5a0838d8542beb91428"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

export default app;
