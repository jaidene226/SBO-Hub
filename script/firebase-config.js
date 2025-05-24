import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAWTG3BsqTxa8Vg_al_PKZvR9MjQ82--_o",
  authDomain: "sbo-hub.firebaseapp.com",
  projectId: "sbo-hub",
  storageBucket: "sbo-hub.firebasestorage.app",
  messagingSenderId: "78045768518",
  appId: "1:78045768518:web:db054a5dfacd490acfd347",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
// export const accountsCollection = db.collection("accounts");
