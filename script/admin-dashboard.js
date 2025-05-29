import { db } from "./firebase-config.js";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  orderBy,
  onSnapshot,
  setDoc,
  deleteField,
  serverTimestamp,
  where, // ✅ Added missing import
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";

const currentUser = JSON.parse(localStorage.getItem("currentUser"));

if (!currentUser || !currentUser.isAdmin) {
  window.location.href = "./login.html";
}

const navbar = document.querySelectorAll("#navbar .nav-button");
const content = [document.getElementById("home"), document.getElementById("events")];

let activeTab = parseInt(localStorage.getItem("activeTab") || 0, 10);
if (!content[activeTab]) {
  activeTab = 0;
  localStorage.setItem("activeTab", activeTab);
}

function setActiveTab(index) {
  navbar.forEach((btn) => btn.classList.remove("active"));
  content.forEach((section) => section.classList.remove("active"));
  navbar[index].classList.add("active");
  content[index].classList.add("active");
}

setActiveTab(activeTab);

function setupAllDropdowns(container) {
  container.querySelectorAll(".slider-toggle").forEach((toggle) => {
    const dropdown = toggle.nextElementSibling;

    toggle.addEventListener("click", (e) => {
      e.stopPropagation();

      document.querySelectorAll(".dropdown").forEach((dd) => {
        if (dd !== dropdown) dd.classList.add("hidden");
      });

      dropdown.classList.toggle("hidden");
    });
  });
}

document.addEventListener("click", () => {
  document.querySelectorAll(".dropdown").forEach((dropdown) => {
    dropdown.classList.add("hidden");
  });
});

navbar.forEach((button, index) => {
  button.addEventListener("click", () => {
    activeTab = index;
    localStorage.setItem("activeTab", index);
    setActiveTab(index);
  });
});

const postModal = document.getElementById("post-modal");
const eventModal = document.getElementById("event-modal");

document.querySelector(".new-post").addEventListener("click", () => {
  postModal.classList.remove("hidden");
});

document.querySelector(".new-event").addEventListener("click", () => {
  eventModal.classList.remove("hidden");
});

document.querySelectorAll(".modal-close").forEach((btn) =>
  btn.addEventListener("click", () => {
    postModal.classList.add("hidden");
    eventModal.classList.add("hidden");
  })
);

document.querySelector("#post-modal .modal-save").addEventListener("click", async () => {
  const text = document.getElementById("post-text").value.trim();
  const image = document.getElementById("post-image").files[0];
  if (!text && !image) return;

  if (image) {
    const reader = new FileReader();
    reader.onload = async () => {
      const imageDataUrl = reader.result;
      await savePostToFirestore(text, imageDataUrl);
      postModal.classList.add("hidden");
      loadPosts();
    };
    reader.readAsDataURL(image); // ✅ Proper use
  } else {
    await savePostToFirestore(text, null);
    postModal.classList.add("hidden");
    loadPosts();
  }
});

async function savePostToFirestore(text, image) {
  try {
    await addDoc(collection(db, "posts"), {
      text,
      image,
      timestamp: serverTimestamp(), // ✅ Fixed missing
    });
  } catch (e) {
    console.error("Error saving post:", e);
  }
}

document.querySelector("#event-modal .modal-save").addEventListener("click", async () => {
  const eventData = {
    title: document.getElementById("event-title").value.trim(),
    date: document.getElementById("event-date").value,
    start: document.getElementById("event-start").value,
    end: document.getElementById("event-end").value,
    description: document.getElementById("event-description").value.trim(),
    location: document.getElementById("event-location").value.trim(),
  };

  if (!eventData.title) return;

  await saveEventToFirestore(eventData);

  ["event-title", "event-date", "event-start", "event-end", "event-description", "event-location"]
    .forEach((id) => (document.getElementById(id).value = ""));

  eventModal.classList.add("hidden");
  loadEvents();
});

async function saveEventToFirestore(eventData) {
  try {
    const eventRef = await addDoc(collection(db, "events"), {
      ...eventData,
      timestamp: serverTimestamp(),
    });

    await addDoc(collection(db, "notifications"), {
      type: "new_event",
      title: eventData.title,
      eventId: eventRef.id,
      timestamp: serverTimestamp(),
    });
  } catch (e) {
    console.error("Error saving event:", e);
  }
}

async function loadPosts() {
  const container = document.querySelector(".post-container");
  container.innerHTML = "";

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
          <div class="slider">
            <img src="./../media/slider.png" alt="slider" class="slider-toggle" />
            <div class="dropdown hidden">
              <button class="delete-post"><img src="./../media/delete.png" alt="" /> Delete</button>
            </div>
          </div>
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

      const likesQuery = query(collection(db, "likes"));
      onSnapshot(likesQuery, (likeSnap) => {
        const count = likeSnap.docs.filter((d) => d.id.startsWith(`${postId}_`)).length;
        likeCount.textContent = `(${count})`;
      });

      const likeRef = doc(db, "likes", `${postId}_admin`);
      getDoc(likeRef).then((snap) => {
        if (snap.exists()) {
          likeIcon.src = "./../media/heart-red.png";
        }
      });

      likeIcon.addEventListener("click", async () => {
        const likeSnap = await getDoc(likeRef);
        if (likeSnap.exists()) {
          await deleteDoc(likeRef);
          likeIcon.src = "./../media/heart.png";
        } else {
          await setDoc(likeRef, {
            userId: "admin",
            postId,
            timestamp: new Date(),
          });
          likeIcon.src = "./../media/heart-red.png";
        }
      });

      const commentsQuery = query(
        collection(db, "posts", postId, "comments"),
        orderBy("timestamp", "asc")
      );

      onSnapshot(commentsQuery, (commentsSnap) => {
        commentContainer.innerHTML = "";
        commentsSnap.forEach((commentDoc) => {
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
          user: "admin",
          text,
          timestamp: new Date(),
        });
        commentInput.value = "";
      });

      postDiv.querySelector(".delete-post").addEventListener("click", async () => {
        if (confirm("Are you sure you want to delete this post?")) {
          await deleteDoc(doc(db, "posts", postId));
        }
      });

      container.appendChild(postDiv);
    });

    setupAllDropdowns(container);
  });
}

async function loadEvents() {
  const container = document.querySelector(".event-container");
  container.innerHTML = "";

  const snapshot = await getDocs(query(collection(db, "events"), orderBy("timestamp", "desc")));

  snapshot.forEach((docSnap) => {
    const event = docSnap.data();
    const eventId = docSnap.id;
    const eventDiv = document.createElement("div");
    eventDiv.className = "content";

    eventDiv.innerHTML = `
      <div class="slider">
        <img src="./../media/slider.png" alt="slider" class="slider-toggle" />
        <div class="dropdown hidden">
          <button class="delete-event"><img src="./../media/delete.png" alt="" /> Delete</button>
        </div>
      </div>
      <h2>${event.title}</h2>
      <span>
        <img src="./../media/when.png" alt="" />
        <p><b>When: </b>${event.date} &ndash; ${event.start} to ${event.end}</p>
      </span>
      <span>
        <img src="./../media/why.png" alt="" />
        <p><b>Why: </b><i>${event.description}</i></p>
      </span>
      <span>
        <img src="./../media/where.png" alt="" />
        <p><b>Where: </b>${event.location}</p>
      </span>
    `;

    eventDiv.querySelector(".delete-event").addEventListener("click", async () => {
      if (confirm("Are you sure you want to delete this event?")) {
        try {
          await deleteDoc(doc(db, "events", eventId));

          const notifQuery = query(
            collection(db, "notifications"),
            where("eventId", "==", eventId)
          );
          const notifSnapshot = await getDocs(notifQuery);

          for (const notifDoc of notifSnapshot.docs) {
            await deleteDoc(doc(db, "notifications", notifDoc.id));
          }

          loadEvents();
        } catch (error) {
          console.error("Error deleting event and related notifications:", error);
          alert("Failed to delete event or notifications.");
        }
      }
    });

    container.appendChild(eventDiv);
  });

  setupAllDropdowns(container);
}

const logoutBtn = document.getElementById("logout-btn");

if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    if (confirm("Are you sure you want to log out?")) {
      localStorage.removeItem("currentUser");
      window.location.href = "./login.html";
    }
  });
}

loadPosts();
loadEvents();


// import { db } from "./firebase-config.js";
// import {
//   collection,
//   addDoc,
//   deleteDoc,
//   doc,
//   getDoc,
//   getDocs,
//   query,
//   orderBy,
//   onSnapshot,
//   setDoc,
//   deleteField,
// } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";

// const currentUser = JSON.parse(localStorage.getItem("currentUser"));

// if (!currentUser || !currentUser.isAdmin) {
//   window.location.href = "./login.html";
// }

// const navbar = document.querySelectorAll("#navbar .nav-button");
// const content = [document.getElementById("home"), document.getElementById("events")];

// let activeTab = parseInt(localStorage.getItem("activeTab") || 0, 10);
// if (!content[activeTab]) {
//   activeTab = 0;
//   localStorage.setItem("activeTab", activeTab);
// }

// function setActiveTab(index) {
//   navbar.forEach((btn) => btn.classList.remove("active"));
//   content.forEach((section) => section.classList.remove("active"));
//   navbar[index].classList.add("active");
//   content[index].classList.add("active");
// }

// setActiveTab(activeTab);

// function setupAllDropdowns(container) {
//   container.querySelectorAll(".slider-toggle").forEach((toggle) => {
//     const dropdown = toggle.nextElementSibling;

//     toggle.addEventListener("click", (e) => {
//       e.stopPropagation();

//       document.querySelectorAll(".dropdown").forEach((dd) => {
//         if (dd !== dropdown) dd.classList.add("hidden");
//       });

//       dropdown.classList.toggle("hidden");
//     });
//   });
// }

// document.addEventListener("click", () => {
//   document.querySelectorAll(".dropdown").forEach((dropdown) => {
//     dropdown.classList.add("hidden");
//   });
// });

// navbar.forEach((button, index) => {
//   button.addEventListener("click", () => {
//     activeTab = index;
//     localStorage.setItem("activeTab", index);
//     setActiveTab(index);
//   });
// });

// const postModal = document.getElementById("post-modal");
// const eventModal = document.getElementById("event-modal");

// document.querySelector(".new-post").addEventListener("click", () => {
//   postModal.classList.remove("hidden");
// });

// document.querySelector(".new-event").addEventListener("click", () => {
//   eventModal.classList.remove("hidden");
// });

// document.querySelectorAll(".modal-close").forEach((btn) =>
//   btn.addEventListener("click", () => {
//     postModal.classList.add("hidden");
//     eventModal.classList.add("hidden");
//   })
// );

// document.querySelector("#post-modal .modal-save").addEventListener("click", async () => {
//   const text = document.getElementById("post-text").value.trim();
//   const image = document.getElementById("post-image").files[0];
//   if (!text && !image) return;

//   let imageDataUrl = null;
//   if (image) {
//     const reader = new FileReader();
//     reader.onload = async () => {
//       imageDataUrl = reader.result;
//       await savePostToFirestore(text, imageDataUrl);
//       postModal.classList.add("hidden");
//       loadPosts();
//     };
//     reader.readAsDataURL(image);
//   } else {
//     await savePostToFirestore(text, null);
//     postModal.classList.add("hidden");
//     loadPosts();
//   }
// });

// async function savePostToFirestore(text, image) {
//   await addDoc(collection(db, "posts"), {
//     text,
//     image,
//     timestamp: serverTimestamp(),
//   });
// }

// document.querySelector("#event-modal .modal-save").addEventListener("click", async () => {
//   const eventData = {
//     title: document.getElementById("event-title").value.trim(),
//     date: document.getElementById("event-date").value,
//     start: document.getElementById("event-start").value,
//     end: document.getElementById("event-end").value,
//     description: document.getElementById("event-description").value.trim(),
//     location: document.getElementById("event-location").value.trim(),
//   };

//   if (!eventData.title) return;

//   await saveEventToFirestore(eventData);

//   [
//     "event-title",
//     "event-date",
//     "event-start",
//     "event-end",
//     "event-description",
//     "event-location",
//   ].forEach((id) => (document.getElementById(id).value = ""));

//   eventModal.classList.add("hidden");
//   loadEvents();
// });

// async function saveEventToFirestore(eventData) {
//   const eventRef = await addDoc(collection(db, "events"), {
//     ...eventData,
//     timestamp: serverTimestamp(),
//   });

//   await addDoc(collection(db, "notifications"), {
//     type: "new_event",
//     title: eventData.title,
//     eventId: eventRef.id,
//     timestamp: serverTimestamp(),
//   });
// }

// async function loadPosts() {
//   const container = document.querySelector(".post-container");
//   container.innerHTML = "";

//   const postsQuery = query(collection(db, "posts"), orderBy("timestamp", "desc"));

//   onSnapshot(postsQuery, (snapshot) => {
//     container.innerHTML = "";

//     snapshot.forEach((docSnap) => {
//       const post = docSnap.data();
//       const postId = docSnap.id;

//       const postDiv = document.createElement("div");
//       postDiv.className = "content";

//       postDiv.innerHTML = `
//         <div class="header">
//           <img src="./../media/logo1.png" alt="" class="header-logo" />
//           <h4>College of Computer Studies SBO - LSPU Siniloan Campus</h4>
//           <div class="slider">
//             <img src="./../media/slider.png" alt="slider" class="slider-toggle" />
//             <div class="dropdown hidden">
//               <button class="delete-post"><img src="./../media/delete.png" alt="" /> Delete</button>
//             </div>
//           </div>
//         </div>

//         <div class="body">
//           <p>${post.text}</p>
//           ${post.image ? `<img src="${post.image}" alt="Post Image" />` : ""}
//         </div>

//         <div class="footer">
//           <div class="react">
//             <img class="like-icon" src="./../media/heart.png" alt="like" />
//             <p>Like</p>
//             <p class="like-count">(0)</p>
//           </div>

//           <div class="comment">
//             <img src="./../media/comment.png" alt="comment" />
//             <p>Comment</p>
//           </div>
//         </div>

//         <div class="comment-section">
//           <div class="comment-container"></div>
//           <div class="comment-input">
//             <img src="./../media/logo1.png" alt="" />
//             <input type="text" placeholder="Comment" />
//             <img src="./../media/send.png" alt="send" class="send-comment" />
//           </div>
//         </div>
//       `;

//       const likeIcon = postDiv.querySelector(".like-icon");
//       const likeCount = postDiv.querySelector(".like-count");
//       const commentContainer = postDiv.querySelector(".comment-container");
//       const commentInput = postDiv.querySelector(".comment-input input");
//       const sendButton = postDiv.querySelector(".send-comment");

//       //
//       const likesQuery = query(collection(db, "likes"));
//       onSnapshot(likesQuery, (likeSnap) => {
//         const count = likeSnap.docs.filter((d) => d.id.startsWith(`${postId}_`)).length;
//         likeCount.textContent = `(${count})`;
//       });

//       const likeRef = doc(db, "likes", `${postId}_admin`);
//       getDoc(likeRef).then((snap) => {
//         if (snap.exists()) {
//           likeIcon.src = "./../media/heart-red.png";
//         }
//       });

//       likeIcon.addEventListener("click", async () => {
//         const likeSnap = await getDoc(likeRef);
//         if (likeSnap.exists()) {
//           await deleteDoc(likeRef);
//           likeIcon.src = "./../media/heart.png";
//         } else {
//           await setDoc(likeRef, {
//             userId: "admin",
//             postId,
//             timestamp: new Date(),
//           });
//           likeIcon.src = "./../media/heart-red.png";
//         }
//       });

//       const commentsQuery = query(
//         collection(db, "posts", postId, "comments"),
//         orderBy("timestamp", "asc")
//       );

//       onSnapshot(commentsQuery, (commentsSnap) => {
//         commentContainer.innerHTML = "";
//         commentsSnap.forEach((commentDoc) => {
//           const c = commentDoc.data();
//           const cDiv = document.createElement("div");
//           cDiv.className = "comment-content";
//           cDiv.innerHTML = `<h4>${c.user || "Anonymous"}</h4><p>${c.text}</p>`;
//           commentContainer.appendChild(cDiv);
//         });
//       });

//       sendButton.addEventListener("click", async () => {
//         const text = commentInput.value.trim();
//         if (text === "") return;
//         await addDoc(collection(db, "posts", postId, "comments"), {
//           user: "admin",
//           text,
//           timestamp: new Date(),
//         });
//         commentInput.value = "";
//       });

//       postDiv.querySelector(".delete-post").addEventListener("click", async () => {
//         if (confirm("Are you sure you want to delete this post?")) {
//           await deleteDoc(doc(db, "posts", postId));
//         }
//       });

//       container.appendChild(postDiv);
//     });

//     setupAllDropdowns(container);
//   });
// }

// async function loadEvents() {
//   const container = document.querySelector(".event-container");
//   container.innerHTML = "";

//   const snapshot = await getDocs(query(collection(db, "events"), orderBy("timestamp", "desc")));

//   snapshot.forEach((docSnap) => {
//     const event = docSnap.data();
//     const eventId = docSnap.id;
//     const eventDiv = document.createElement("div");
//     eventDiv.className = "content";

//     eventDiv.innerHTML = `
//       <div class="slider">
//         <img src="./../media/slider.png" alt="slider" class="slider-toggle" />
//         <div class="dropdown hidden">
//           <button class="delete-event"><img src="./../media/delete.png" alt="" /> Delete</button>
//         </div>
//       </div>
//       <h2>${event.title}</h2>
//       <span>
//         <img src="./../media/when.png" alt="" />
//         <p><b>When: </b>${event.date} &ndash; ${event.start} to ${event.end}</p>
//       </span>
//       <span>
//         <img src="./../media/why.png" alt="" />
//         <p><b>Why: </b><i>${event.description}</i></p>
//       </span>
//       <span>
//         <img src="./../media/where.png" alt="" />
//         <p><b>Where: </b>${event.location}</p>
//       </span>
//     `;

//     eventDiv.querySelector(".delete-event").addEventListener("click", async () => {
//       if (confirm("Are you sure you want to delete this event?")) {
//         try {
//           await deleteDoc(doc(db, "events", eventId));

//           const notifQuery = query(
//             collection(db, "notifications"),
//             where("eventId", "==", eventId)
//           );
//           const notifSnapshot = await getDocs(notifQuery);

//           for (const notifDoc of notifSnapshot.docs) {
//             await deleteDoc(doc(db, "notifications", notifDoc.id));
//           }

//           loadEvents();
//         } catch (error) {
//           console.error("Error deleting event and related notifications:", error);
//           alert("Failed to delete event or notifications.");
//         }
//       }
//     });

//     container.appendChild(eventDiv);
//   });

//   setupAllDropdowns(container);
// }

// const logoutBtn = document.getElementById("logout-btn");

// if (logoutBtn) {
//   logoutBtn.addEventListener("click", () => {
//     if (confirm("Are you sure you want to log out?")) {
//       localStorage.removeItem("currentUser");
//       window.location.href = "./login.html";
//     }
//   });
// }

// loadPosts();
// loadEvents();
