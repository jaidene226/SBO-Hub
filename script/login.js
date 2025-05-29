import { db } from "./firebase-config.js";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return hashHex;
}

const form = document.getElementById("login-form");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const studentNo = form.elements["student-no"].value.trim();
  const password = form.elements["password"].value;

  if (!studentNo || !password) {
    alert("Please enter both Student No. and Password.");
    return;
  }

  try {
    const accountsRef = collection(db, "accounts");
    const q = query(accountsRef, where("studentNo", "==", studentNo));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      alert("Invalid credentials. Please try again.");
      return;
    }

    const hashedPassword = await hashPassword(password);

    let matchedAccount = null;
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.password === hashedPassword) {
        matchedAccount = { id: doc.id, ...data };
      }
    });

    if (!matchedAccount) {
      alert("Invalid credentials. Please try again.");
      return;
    }

    localStorage.setItem("currentUser", JSON.stringify(matchedAccount));

    if (matchedAccount.isAdmin) {
      window.location.href = "./admin-dashboard.html";
    } else {
      await addDoc(collection(db, "loginLogs"), {
        studentNo: matchedAccount.studentNo,
        username: matchedAccount.username,
        course: matchedAccount.course,
        yearSection: matchedAccount.yearSection,
        isAdmin: matchedAccount.isAdmin || false,
        loginTime: serverTimestamp(),
        uid: matchedAccount.uid,
      });

      window.location.href = "./dashboard.html";
    }
  } catch (error) {
    console.error("Login error:", error);
    alert("Something went wrong. Please try again.");
  }
});
