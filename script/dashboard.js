import { db } from "./firebase-config.js";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  onSnapshot,
  addDoc,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";

const currentUser = JSON.parse(localStorage.getItem("currentUser"));

if (!currentUser) {
  window.location.href = "./login.html";
}

document.getElementById("username").textContent = currentUser.username;
document.getElementById("student-no").textContent = currentUser.studentNo;

const navbar = document.querySelectorAll("#navbar .nav-button");
const content = [
  document.getElementById("home"),
  document.getElementById("events"),
  document.getElementById("complaints"),
  document.getElementById("notifications"),
];

let activeTab = parseInt(localStorage.getItem("activeTab") || 0, 10);
if (!content[activeTab]) {
  activeTab = 0;
  localStorage.setItem("activeTab", activeTab);
}

navbar.forEach((btn) => btn.classList.remove("active"));
content.forEach((section) => section.classList.remove("active"));
navbar[activeTab].classList.add("active");
content[activeTab].classList.add("active");

navbar.forEach((button, index) => {
  button.addEventListener("click", () => {
    navbar.forEach((btn) => btn.classList.remove("active"));
    content.forEach((section) => section.classList.remove("active"));
    button.classList.add("active");
    content[index].classList.add("active");
    localStorage.setItem("activeTab", index);
  });
});

document.getElementById("logout-btn").addEventListener("click", () => {
  if (confirm("Are you sure you want to log out?")) {
    localStorage.removeItem("currentUser");
    window.location.href = "./login.html";
  }
});

function loadPosts() {
  const container = document.querySelector(".post-container");
  const postsQuery = query(collection(db, "posts"), orderBy("timestamp", "desc"));

  onSnapshot(postsQuery, (snapshot) => {
    container.innerHTML = "";
    snapshot.forEach((docSnap) => {
      const post = docSnap.data();
      const postId = docSnap.id;

      const postDiv = document.createElement("div");
      postDiv.className = "content";

      postDiv.innerHTML = `
        <div class="header">
          <img src="./../media/logo1.png" alt="" class="header-logo" />
          <h4>College of Computer Studies SBO - LSPU Siniloan Campus</h4>
        </div>

        <div class="body">
          <p>${post.text}</p>
          ${post.image ? `<img src="${post.image}" alt="Post Image" />` : ""}
        </div>

        <div class="footer">
          <div class="react">
            <img class="like-icon" src="./../media/heart.png" alt="like" />
            <p>Like</p>
            <p class="like-count">(0)</p>
          </div>

          <div class="comment">
            <img src="./../media/comment.png" alt="comment" />
            <p>Comment</p>
          </div>
        </div>

        <div class="comment-section">
          <div class="comment-container"></div>
          <div class="comment-input">
            <img src="./../media/logo1.png" alt="" />
            <input type="text" placeholder="Comment" />
            <img src="./../media/send.png" alt="send" class="send-comment" />
          </div>
        </div>
      `;

      const likeIcon = postDiv.querySelector(".like-icon");
      const likeCount = postDiv.querySelector(".like-count");
      const commentContainer = postDiv.querySelector(".comment-container");
      const commentInput = postDiv.querySelector(".comment-input input");
      const sendButton = postDiv.querySelector(".send-comment");

      const likeRef = doc(db, "likes", `${postId}_${currentUser.uid}`);
      getDoc(likeRef).then((docSnap) => {
        if (docSnap.exists()) {
          likeIcon.src = "./../media/heart-red.png";
        }
      });

      onSnapshot(query(collection(db, "likes")), (likesSnapshot) => {
        const count = likesSnapshot.docs.filter((d) => d.id.startsWith(`${postId}_`)).length;
        likeCount.textContent = `(${count})`;
      });

      likeIcon.addEventListener("click", async () => {
        const docSnap = await getDoc(likeRef);
        if (docSnap.exists()) {
          await deleteDoc(likeRef);
          likeIcon.src = "./../media/heart.png";
        } else {
          await setDoc(likeRef, {
            userId: currentUser.uid,
            postId,
            timestamp: Date.now(),
          });
          likeIcon.src = "./../media/heart-red.png";
        }
      });

      const commentsRef = query(
        collection(db, "posts", postId, "comments"),
        orderBy("timestamp", "asc")
      );
      onSnapshot(commentsRef, (commentSnap) => {
        commentContainer.innerHTML = "";
        commentSnap.forEach((commentDoc) => {
          const c = commentDoc.data();
          const cDiv = document.createElement("div");
          cDiv.className = "comment-content";
          cDiv.innerHTML = `<h4>${c.user || "Anonymous"}</h4><p>${c.text}</p>`;
          commentContainer.appendChild(cDiv);
        });
      });

      sendButton.addEventListener("click", async () => {
        const text = commentInput.value.trim();
        if (text === "") return;
        await addDoc(collection(db, "posts", postId, "comments"), {
          user: currentUser.studentNo,
          text,
          timestamp: new Date(),
        });
        commentInput.value = "";
      });

      container.appendChild(postDiv);
    });
  });
}

function loadEvents() {
  const container = document.querySelector(".event-container");
  const eventsQuery = query(collection(db, "events"), orderBy("timestamp", "desc"));

  onSnapshot(eventsQuery, (snapshot) => {
    container.innerHTML = "";
    snapshot.forEach((docSnap) => {
      const event = docSnap.data();
      const eventDiv = document.createElement("div");
      eventDiv.className = "content";
      eventDiv.innerHTML = `
        <h2>${event.title}</h2>
        <span><img src="./../media/when.png" alt="" /><p><b>When:</b> ${event.date} – ${event.start} to ${event.end}</p></span>
        <span><img src="./../media/why.png" alt="" /><p><b>Why:</b> <i>${event.description}</i></p></span>
        <span><img src="./../media/where.png" alt="" /><p><b>Where:</b> ${event.location}</p></span>
        <div class="event-actions">
          <button onclick="window.open('${event.gform}', '_blank')">Open Form</button>
          <button class="open-feedback" data-id="${docSnap.id}" data-title="${event.title}">Give Feedback</button>
        </div>
      `;

      container.appendChild(eventDiv);
    });
  });
}

document.addEventListener("click", (e) => {
  if (e.target.classList.contains("open-feedback")) {
    const eventId = e.target.dataset.id;
    const title = e.target.dataset.title;

    document.getElementById("feedback-title").textContent = `Feedback for ${title}`;
    document.getElementById("feedback-modal").dataset.eventId = eventId;
    document.getElementById("feedback-text").value = "";
    document.getElementById("feedback-modal").classList.remove("hidden");
  }
});

document.getElementById("close-feedback").addEventListener("click", () => {
  document.getElementById("feedback-modal").classList.add("hidden");
});

document.getElementById("submit-feedback").addEventListener("click", async () => {
  const feedback = document.getElementById("feedback-text").value.trim();
  const eventId = document.getElementById("feedback-modal").dataset.eventId;
  const user = JSON.parse(localStorage.getItem("currentUser"));

  if (!feedback) return;

  await addDoc(collection(db, "eventFeedbacks"), {
    eventId,
    studentNo: user?.studentNo || "Anonymous",
    username: user?.username || "",
    feedback,
    timestamp: serverTimestamp(),
  });

  document.getElementById("feedback-modal").classList.add("hidden");
});

function loadNotifications() {
  const container = document.querySelector(".notifications-container");
  const countSpan = document.getElementById("notif-count");
  const notifQuery = query(collection(db, "notifications"), orderBy("timestamp", "desc"));

  onSnapshot(notifQuery, async (snapshot) => {
    container.innerHTML = "";
    let unviewedCount = 0;

    for (const docSnap of snapshot.docs) {
      const notif = docSnap.data();
      const notifId = docSnap.id;
      let isViewed = false;

      try {
        const viewedRef = doc(db, "userViews", currentUser.uid, "viewedNotifications", notifId);
        const viewedSnap = await getDoc(viewedRef);
        isViewed = viewedSnap.exists();
      } catch (err) {
        console.warn("Failed to check viewed status:", err);
      }

      if (!isViewed) unviewedCount++;

      const notifDiv = document.createElement("div");
      notifDiv.className = `notification-item ${isViewed ? "viewed" : ""}`;
      notifDiv.innerHTML = `
        <h3>${notif.title}</h3>
        <p>${new Date(notif.timestamp?.toDate()).toLocaleString()}</p>
      `;

      notifDiv.addEventListener("click", async () => {
        const eventSnap = await getDoc(doc(db, "events", notif.eventId));
        const event = eventSnap.data();
        if (!event) return;

        document.getElementById("notif-event-details").innerHTML = `
          <h2>${event.title}</h2>
          <p><b>When:</b> ${event.date} – ${event.start} to ${event.end}</p>
          <p><b>Why:</b> <i>${event.description}</i></p>
          <p><b>Where:</b> ${event.location}</p>
        `;
        document.getElementById("notification-modal").classList.remove("hidden");

        const viewedRef = doc(db, "userViews", currentUser.uid, "viewedNotifications", notifId);
        await setDoc(viewedRef, { viewed: true, timestamp: serverTimestamp() });

        notifDiv.classList.add("viewed");
      });

      container.appendChild(notifDiv);
    }

    countSpan.textContent = unviewedCount;
  });
}

document.getElementById("notif-modal-close").addEventListener("click", () => {
  document.getElementById("notification-modal").classList.add("hidden");
});

function renderComplaintForm() {
  const container = document.querySelector("#complaints .complaints-container");
  container.innerHTML = `
    <div class="complaint-form">
      <textarea id="complaint-text" placeholder="Write your complaint anonymously..."></textarea>
      <button id="submit-complaint">Submit</button>
    </div>
  `;

  document.getElementById("submit-complaint").addEventListener("click", async () => {
    const text = document.getElementById("complaint-text").value.trim();
    if (!text) return alert("Complaint cannot be empty.");

    await addDoc(collection(db, "complaints"), {
      message: text,
      timestamp: serverTimestamp(),
    });

    document.getElementById("complaint-text").value = "";
    alert("Complaint submitted anonymously.");
  });
}

loadPosts();
loadEvents();
loadNotifications();
renderComplaintForm();
