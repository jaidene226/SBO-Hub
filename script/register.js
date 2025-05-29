import { db } from "./firebase-config.js";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return hashHex;
}

const form = document.getElementById("register-form");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = form.elements["username"].value.trim();
  const studentNo = form.elements["student-no"].value.trim();
  const course = form.elements["course"].value.trim();
  const yearSection = form.elements["year-section"].value.trim();
  const password = form.elements["password"].value;
  const confirmPassword = form.elements["c-password"].value;

  if (!username || !studentNo || !course || !yearSection || !password || !confirmPassword) {
    alert("Please fill out all fields.");
    return;
  }

  if (password.length < 8) {
    alert("Password must be at least 8 characters.");
    return;
  }

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/;
  if (!passwordRegex.test(password)) {
    alert(
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character."
    );
    return;
  }

  if (password !== confirmPassword) {
    alert("Passwords do not match.");
    return;
  }

  try {
    const accountsRef = collection(db, "accounts");
    const q = query(accountsRef, where("studentNo", "==", studentNo));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      alert("This student number is already registered.");
      return;
    }

    const hashedPassword = await hashPassword(password);
    const newUserRef = doc(accountsRef);

    await setDoc(newUserRef, {
      uid: newUserRef.id,
      username,
      studentNo,
      course,
      yearSection,
      password: hashedPassword,
      isAdmin: false,
    });

    alert("Registration successful!");
    form.reset();
    window.location.href = "./login.html";
  } catch (error) {
    console.error("Error registering user:", error);
    alert("Something went wrong. Please try again.");
  }
});
