/* ===============================
   MemoVibe - script.js final
   =============================== */

// -------------------------------
// Helpers : LocalStorage
// -------------------------------
function saveData(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}
function loadData(key, defaultValue = null) {
  let raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : defaultValue;
}

// -------------------------------
// Données principales
// -------------------------------
let currentUser = loadData("memoUser", {
  name: "Utilisateur",
  email: "",
  bio: "",
  photo: ""
});

let posts = loadData("memoPosts", []); // {id, author, authorId, content, category, likes, comments, reactions, date}
let users = loadData("memoUsers", [currentUser]); // liste de tous les profils
let follows = loadData("memoFollows", {}); // { userId: [listIds] }

// -------------------------------
// Profil
// -------------------------------
function updateProfile(name, email, bio, photo) {
  currentUser.name = name;
  currentUser.email = email;
  currentUser.bio = bio;
  if (photo) currentUser.photo = photo;

  // mettre à jour la liste des users
  let idx = users.findIndex(u => u.email === currentUser.email);
  if (idx !== -1) {
    users[idx] = currentUser;
  } else {
    users.push(currentUser);
  }

  saveData("memoUser", currentUser);
  saveData("memoUsers", users);
}

// Charger profil sur profile.html
function loadProfilePage() {
  let nameEl = document.getElementById("profileName");
  let bioEl = document.getElementById("profileBio");
  let photoEl = document.getElementById("profilePhoto");
  let countFollowers = document.getElementById("followersCount");
  let countFollowing = document.getElementById("followingCount");
  let postList = document.getElementById("userPosts");

  if (nameEl) nameEl.textContent = currentUser.name;
  if (bioEl) bioEl.textContent = currentUser.bio;
  if (photoEl && currentUser.photo) photoEl.src = currentUser.photo;

  // followers / following
  let followers = Object.entries(follows).filter(([uid, list]) =>
    list.includes(currentUser.email)
  ).length;
  let following = follows[currentUser.email]?.length || 0;

  if (countFollowers) countFollowers.textContent = followers;
  if (countFollowing) countFollowing.textContent = following;

  if (postList) {
    postList.innerHTML = "";
    posts
      .filter(p => p.authorId === currentUser.email)
      .forEach(p => {
        postList.appendChild(renderPost(p));
      });
  }
}

// -------------------------------
// Posts
// -------------------------------
function addPost(content, category) {
  let newPost = {
    id: Date.now(),
    author: currentUser.name,
    authorId: currentUser.email,
    content,
    category,
    likes: 0,
    comments: [],
    reactions: [],
    date: new Date().toISOString()
  };
  posts.unshift(newPost);
  saveData("memoPosts", posts);
  renderFeed();
}

function likePost(postId) {
  let post = posts.find(p => p.id === postId);
  if (post) {
    post.likes++;
    saveData("memoPosts", posts);
    renderFeed();
  }
}

function commentPost(postId, text) {
  let post = posts.find(p => p.id === postId);
  if (post) {
    post.comments.push({ author: currentUser.name, text });
    saveData("memoPosts", posts);
    renderFeed();
  }
}

function reactPost(postId, emoji) {
  let post = posts.find(p => p.id === postId);
  if (post) {
    post.reactions.push({ author: currentUser.name, emoji });
    saveData("memoPosts", posts);
    renderFeed();
  }
}

// -------------------------------
// Render Posts
// -------------------------------
function renderPost(post) {
  let li = document.createElement("div");
  li.className = "post-card";

  li.innerHTML = `
    <div class="post-header">
      <div class="post-author">${post.author}</div>
      <div class="post-date">${new Date(post.date).toLocaleString()}</div>
    </div>
    <div class="post-content">${post.content}</div>
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

  // Boutons
  li.querySelector(".btn-like").addEventListener("click", () => likePost(post.id));
  li.querySelector(".btn-comment").addEventListener("click", () => {
    let text = prompt("Votre commentaire :");
    if (text) commentPost(post.id, text);
  });
  li.querySelector(".btn-react").addEventListener("click", () => {
    let emoji = prompt("Entrez un emoji :");
    if (emoji) reactPost(post.id, emoji);
  });

  return li;
}

// -------------------------------
// Feed rendering
// -------------------------------
function renderFeed(filter = "friends") {
  let feed = document.getElementById("feed");
  if (!feed) return;

  feed.innerHTML = "";

  let visiblePosts = [];
  if (filter === "friends") {
    let following = follows[currentUser.email] || [];
    visiblePosts = posts.filter(p => following.includes(p.authorId));
  } else if (filter === "mine") {
    visiblePosts = posts.filter(p => p.authorId === currentUser.email);
  } else {
    visiblePosts = posts;
  }

  if (visiblePosts.length === 0) {
    feed.innerHTML = "<p>Aucune expérience partagée pour le moment.</p>";
    return;
  }

  visiblePosts.forEach(p => feed.appendChild(renderPost(p)));
}

// -------------------------------
// Abonnements
// -------------------------------
function followUser(targetEmail) {
  if (!follows[currentUser.email]) follows[currentUser.email] = [];
  if (!follows[currentUser.email].includes(targetEmail)) {
    follows[currentUser.email].push(targetEmail);
    saveData("memoFollows", follows);
  }
}
function unfollowUser(targetEmail) {
  if (!follows[currentUser.email]) return;
  follows[currentUser.email] = follows[currentUser.email].filter(e => e !== targetEmail);
  saveData("memoFollows", follows);
}

// -------------------------------
// Recherche
// -------------------------------
function search(type, query, category = null) {
  if (type === "profile") {
    return users.filter(u => u.name.toLowerCase().includes(query.toLowerCase()));
  } else if (type === "experience") {
    return posts.filter(p => {
      let matchText = p.content.toLowerCase().includes(query.toLowerCase());
      let matchCat = category ? p.category === category : true;
      return matchText && matchCat;
    });
  }
  return [];
}

// -------------------------------
// Menu Hamburger
// -------------------------------
function setupMenu() {
  let btn = document.getElementById("menuBtn");
  let menu = document.getElementById("sideMenu");
  if (!btn || !menu) return;

  btn.addEventListener("click", () => {
    menu.classList.toggle("open");
  });
}

// -------------------------------
// Initialisation
// -------------------------------
document.addEventListener("DOMContentLoaded", () => {
  setupMenu();
  renderFeed("friends");
  if (document.body.classList.contains("profile-page")) {
    loadProfilePage();
  }

  // Gestion formulaire post
  let postForm = document.getElementById("postForm");
  if (postForm) {
    postForm.addEventListener("submit", e => {
      e.preventDefault();
      let content = document.getElementById("postContent").value;
      let category = document.getElementById("postCategory").value;
      if (content && category) {
        addPost(content, category);
        postForm.reset();
      }
    });
  }

  // Boutons de feed
  let btnFriends = document.getElementById("feedFriends");
  let btnGeneral = document.getElementById("feedGeneral");
  let btnMine = document.getElementById("feedMine");

  if (btnFriends) btnFriends.addEventListener("click", () => renderFeed("friends"));
  if (btnGeneral) btnGeneral.addEventListener("click", () => renderFeed("all"));
  if (btnMine) btnMine.addEventListener("click", () => renderFeed("mine"));
});
