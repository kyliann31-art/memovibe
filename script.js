/* ========================================
   MemoVibe — Script JS complet et amélioré
   ======================================== */

/* -----------------------------
   Helpers : LocalStorage
----------------------------- */
function saveData(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}
function loadData(key, defaultValue = null) {
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : defaultValue;
}

/* -----------------------------
   Données principales
----------------------------- */
let currentUser = loadData("memoUser", {
  name: "Utilisateur",
  email: "",
  bio: "",
  photo: ""
});
let posts = loadData("memoPosts", []);
let users = loadData("memoUsers", [currentUser]);
let follows = loadData("memoFollows", {}); // { userEmail: [listOfEmails] }

/* -----------------------------
   Toasts
----------------------------- */
function showToast(message) {
  const toast = document.getElementById("toast") || document.getElementById("toastProfile");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2500);
}

/* -----------------------------
   Profil
----------------------------- */
function updateProfile({ name, email, bio, photo }) {
  currentUser.name = name || currentUser.name;
  currentUser.email = email || currentUser.email;
  currentUser.bio = bio || currentUser.bio;
  if (photo) currentUser.photo = photo;

  const idx = users.findIndex(u => u.email === currentUser.email);
  if (idx >= 0) users[idx] = currentUser;
  else users.push(currentUser);

  saveData("memoUser", currentUser);
  saveData("memoUsers", users);
  showToast("Profil mis à jour !");
}

function loadProfilePage() {
  const nameEl = document.getElementById("profileName");
  const bioEl = document.getElementById("profileBio");
  const photoEl = document.getElementById("profileAvatar");
  const postList = document.getElementById("userPosts");
  const followersList = document.getElementById("followersList");
  const followingList = document.getElementById("followingList");

  if (nameEl) nameEl.textContent = currentUser.name;
  if (bioEl) bioEl.textContent = currentUser.bio || "Ta bio ici";
  if (photoEl && currentUser.photo) photoEl.src = currentUser.photo;

  // Followers / Following
  const followers = Object.entries(follows).filter(([uid, list]) => list.includes(currentUser.email));
  const following = follows[currentUser.email] || [];

  if (followersList) followersList.innerHTML = followers.map(([uid]) => `<p>${uid}</p>`).join("");
  if (followingList) followingList.innerHTML = following.map(email => `<p>${email}</p>`).join("");

  // User posts
  if (postList) {
    postList.innerHTML = "";
    posts.filter(p => p.authorId === currentUser.email).forEach(p => postList.appendChild(renderPost(p)));
  }
}

/* -----------------------------
   Posts
----------------------------- */
function addPost(content, category, image = null) {
  if (!content) return;
  const newPost = {
    id: Date.now(),
    author: currentUser.name,
    authorId: currentUser.email,
    content,
    category: category || "autre",
    image,
    likes: 0,
    comments: [],
    reactions: [],
    date: new Date().toISOString()
  };
  posts.unshift(newPost);
  saveData("memoPosts", posts);
  renderFeed(currentFilter || "friends");
  showToast("Expérience publiée !");
}

function likePost(postId) {
  const post = posts.find(p => p.id === postId);
  if (post) {
    post.likes++;
    saveData("memoPosts", posts);
    renderFeed(currentFilter || "friends");
  }
}

function commentPost(postId, text) {
  const post = posts.find(p => p.id === postId);
  if (post) {
    post.comments.push({ author: currentUser.name, text });
    saveData("memoPosts", posts);
    renderFeed(currentFilter || "friends");
  }
}

function reactPost(postId, emoji) {
  const post = posts.find(p => p.id === postId);
  if (post && emoji) {
    post.reactions.push({ author: currentUser.name, emoji });
    saveData("memoPosts", posts);
    renderFeed(currentFilter || "friends");
  }
}

/* -----------------------------
   Render post
----------------------------- */
function renderPost(post) {
  const div = document.createElement("div");
  div.className = "post-card";

  div.innerHTML = `
    <div class="post-header">
      <div class="post-author">${post.author}</div>
      <div class="post-date">${new Date(post.date).toLocaleString()}</div>
    </div>
    <div class="post-content">${post.content}</div>
    ${post.image ? `<img src="${post.image}" class="post-image">` : ""}
    <div class="post-category">Catégorie : ${post.category}</div>
    <div class="post-actions">
      <button class="btn-like">👍 ${post.likes}</button>
      <button class="btn-comment">💬 ${post.comments.length}</button>
      <button class="btn-react">😀</button>
    </div>
    <div class="post-comments">
      ${post.comments.map(c => `<p><strong>${c.author}:</strong> ${c.text}</p>`).join("")}
    </div>
    <div class="post-reactions">
      ${post.reactions.map(r => `<span>${r.emoji}</span>`).join(" ")}
    </div>
  `;

  div.querySelector(".btn-like").addEventListener("click", () => likePost(post.id));
  div.querySelector(".btn-comment").addEventListener("click", () => {
    const text = prompt("Votre commentaire :");
    if (text) commentPost(post.id, text);
  });
  div.querySelector(".btn-react").addEventListener("click", () => {
    const emoji = prompt("Entrez un emoji :");
    if (emoji) reactPost(post.id, emoji);
  });

  return div;
}

/* -----------------------------
   Feed rendering
----------------------------- */
let currentFilter = "friends";
function renderFeed(filter = "friends") {
  const feed = document.getElementById("postsList");
  if (!feed) return;

  currentFilter = filter;
  feed.innerHTML = "";

  let visiblePosts = [];
  if (filter === "friends") {
    const following = follows[currentUser.email] || [];
    visiblePosts = posts.filter(p => following.includes(p.authorId));
  } else if (filter === "mine") {
    visiblePosts = posts.filter(p => p.authorId === currentUser.email);
  } else {
    visiblePosts = posts;
  }

  if (visiblePosts.length === 0) {
    feed.innerHTML = "<p>Aucune expérience disponible.</p>";
    return;
  }

  visiblePosts.forEach(p => feed.appendChild(renderPost(p)));
}

/* -----------------------------
   Abonnements
----------------------------- */
function followUser(targetEmail) {
  if (!follows[currentUser.email]) follows[currentUser.email] = [];
  if (!follows[currentUser.email].includes(targetEmail)) {
    follows[currentUser.email].push(targetEmail);
    saveData("memoFollows", follows);
    showToast("Vous suivez " + targetEmail);
  }
}

function unfollowUser(targetEmail) {
  if (!follows[currentUser.email]) return;
  follows[currentUser.email] = follows[currentUser.email].filter(e => e !== targetEmail);
  saveData("memoFollows", follows);
  showToast("Vous ne suivez plus " + targetEmail);
}

/* -----------------------------
   Recherche
----------------------------- */
function search(type, query, category = null) {
  if (type === "profile") {
    return users.filter(u => u.name.toLowerCase().includes(query.toLowerCase()));
  } else if (type === "experience") {
    return posts.filter(p => {
      const matchText = p.content.toLowerCase().includes(query.toLowerCase());
      const matchCat = category ? p.category === category : true;
      return matchText && matchCat;
    });
  }
  return [];
}

/* -----------------------------
   Menu hamburger
----------------------------- */
function setupMenu() {
  const hamburger = document.getElementById("hamburger");
  const sideMenu = document.getElementById("sideMenu");
  const closeBtn = document.getElementById("closeMenu");

  if (!hamburger || !sideMenu || !closeBtn) return;

  hamburger.addEventListener("click", () => sideMenu.classList.add("show"));
  closeBtn.addEventListener("click", () => sideMenu.classList.remove("show"));
}

/* -----------------------------
   Initialisation DOM
----------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  setupMenu();
  renderFeed("friends");

  if (document.body.classList.contains("profile-page")) loadProfilePage();

  // Post composer
  const postBtn = document.getElementById("postBtn");
  if (postBtn) {
    postBtn.addEventListener("click", () => {
      const content = document.getElementById("composerText").value;
      const category = document.getElementById("composerCategory").value;
      addPost(content, category);
      document.getElementById("composerText").value = "";
      document.getElementById("composerCategory").value = "";
    });
  }

  // Feed filters
  const feedBtns = document.querySelectorAll(".nav-btn");
  feedBtns.forEach(btn => btn.addEventListener("click", e => {
    feedBtns.forEach(b => b.classList.remove("active"));
    e.target.classList.add("active");
    renderFeed(e.target.dataset.feed);
  }));

  // Profile edit
  const editBtn = document.getElementById("editProfileBtn");
  if (editBtn) editBtn.addEventListener("click", () => {
    const form = document.getElementById("profileEdit");
    if (form) form.classList.toggle("hidden");
  });

  const saveBtn = document.getElementById("saveProfile");
  if (saveBtn) saveBtn.addEventListener("click", () => {
    const name = document.getElementById("inputName").value;
    const email = document.getElementById("inputEmail").value;
    const bio = document.getElementById("inputBio").value;
    updateProfile({ name, email, bio });
    loadProfilePage();
  });

  // Avatar upload
  const avatarInput = document.getElementById("avatarUpload");
  if (avatarInput) avatarInput.addEventListener("change", e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      updateProfile({ photo: reader.result });
      loadProfilePage();
    };
    reader.readAsDataURL(file);
  });
});
