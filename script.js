/* ===============================
   MemoVibe - script.js final complet
   =============================== */

/* -------------------------------
   Helpers : LocalStorage
------------------------------- */
function saveData(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

function loadData(key, defaultValue = null) {
  let raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : defaultValue;
}

function showToast(message, duration = 2500) {
  const toastEl = document.getElementById("toast") || document.getElementById("toastProfile");
  if (!toastEl) return;
  toastEl.textContent = message;
  toastEl.classList.add("show");
  setTimeout(() => toastEl.classList.remove("show"), duration);
}

/* -------------------------------
   Données principales
------------------------------- */
let currentUser = loadData("memoUser", { name: "Utilisateur", email: "", bio: "", photo: "" });
let posts = loadData("memoPosts", []);
let users = loadData("memoUsers", [currentUser]);
let follows = loadData("memoFollows", {});

/* -------------------------------
   Profil
------------------------------- */
function updateProfile(name, email, bio, photo) {
  currentUser.name = name;
  currentUser.email = email;
  currentUser.bio = bio;
  if (photo) currentUser.photo = photo;

  const idx = users.findIndex(u => u.email === currentUser.email);
  if (idx !== -1) users[idx] = currentUser;
  else users.push(currentUser);

  saveData("memoUser", currentUser);
  saveData("memoUsers", users);
  showToast("Profil mis à jour !");
  renderMiniAvatars();
}

/* Charger profil sur profile.html */
function loadProfilePage() {
  document.getElementById("profileName").textContent = currentUser.name;
  document.getElementById("profileBio").textContent = currentUser.bio || "Ta bio ici";
  if (currentUser.photo) document.getElementById("profileAvatar").src = currentUser.photo;

  document.getElementById("profilePosts").textContent = posts.filter(p => p.authorId === currentUser.email).length;
  document.getElementById("profileFollowing").textContent = (follows[currentUser.email] || []).length;
  document.getElementById("profileFollowers").textContent = Object.values(follows).filter(list => list.includes(currentUser.email)).length;

  renderUserPosts();
  renderFollowingList();
  renderFollowersList();
}

/* -------------------------------
   Posts
------------------------------- */
function addPost(content, category, image = null) {
  const newPost = {
    id: Date.now(),
    author: currentUser.name,
    authorId: currentUser.email,
    content,
    category,
    likes: 0,
    comments: [],
    reactions: [],
    date: new Date().toISOString(),
    image
  };
  posts.unshift(newPost);
  saveData("memoPosts", posts);
  renderFeed(currentFeedFilter || "friends");
  showToast("Expérience publiée !");
}

function likePost(postId) {
  const post = posts.find(p => p.id === postId);
  if (post) { post.likes++; saveData("memoPosts", posts); renderFeed(currentFeedFilter); }
}

function commentPost(postId, text) {
  const post = posts.find(p => p.id === postId);
  if (post) { post.comments.push({ author: currentUser.name, text }); saveData("memoPosts", posts); renderFeed(currentFeedFilter); }
}

function reactPost(postId, emoji) {
  const post = posts.find(p => p.id === postId);
  if (post) { post.reactions.push({ author: currentUser.name, emoji }); saveData("memoPosts", posts); renderFeed(currentFeedFilter); }
}

/* -------------------------------
   Render Posts
------------------------------- */
function renderPost(post) {
  const div = document.createElement("div");
  div.className = "post-card";

  div.innerHTML = `
    <div class="post-header">
      <div class="post-author">${post.author}</div>
      <div class="post-date">${new Date(post.date).toLocaleString()}</div>
    </div>
    <div class="post-content">${post.content}</div>
    ${post.image ? `<img class="post-image" src="${post.image}" alt="image post">` : ""}
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

/* -------------------------------
   Feed rendering
------------------------------- */
let currentFeedFilter = "friends";

function renderFeed(filter = "friends") {
  currentFeedFilter = filter;
  const feedEl = document.getElementById("postsList") || document.getElementById("feed");
  if (!feedEl) return;

  feedEl.innerHTML = "";
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
    feedEl.innerHTML = "<p>Aucune expérience partagée pour le moment.</p>";
    return;
  }

  visiblePosts.forEach(p => feedEl.appendChild(renderPost(p)));
}

/* -------------------------------
   User Posts & Followers/Following
------------------------------- */
function renderUserPosts() {
  const postList = document.getElementById("userPosts");
  if (!postList) return;
  postList.innerHTML = "";
  posts.filter(p => p.authorId === currentUser.email).forEach(p => postList.appendChild(renderPost(p)));
}

function renderFollowingList() {
  const el = document.getElementById("followingList");
  if (!el) return;
  el.innerHTML = "";
  (follows[currentUser.email] || []).forEach(email => {
    const user = users.find(u => u.email === email);
    if (user) {
      const div = document.createElement("div");
      div.textContent = user.name;
      el.appendChild(div);
    }
  });
}

function renderFollowersList() {
  const el = document.getElementById("followersList");
  if (!el) return;
  el.innerHTML = "";
  Object.entries(follows).forEach(([uid, list]) => {
    if (list.includes(currentUser.email)) {
      const user = users.find(u => u.email === uid);
      if (user) {
        const div = document.createElement("div");
        div.textContent = user.name;
        el.appendChild(div);
      }
    }
  });
}

/* -------------------------------
   Mini avatar rendering
------------------------------- */
function renderMiniAvatars() {
  document.querySelectorAll("#miniAvatar, #miniAvatar2").forEach(img => { if (currentUser.photo) img.src = currentUser.photo; });
  document.querySelectorAll("#composerAvatar").forEach(img => { if (currentUser.photo) img.src = currentUser.photo; });
  document.querySelectorAll("#sidebarAvatar").forEach(img => { if (currentUser.photo) img.src = currentUser.photo; });
}

/* -------------------------------
   Abonnements
------------------------------- */
function followUser(targetEmail) {
  if (!follows[currentUser.email]) follows[currentUser.email] = [];
  if (!follows[currentUser.email].includes(targetEmail)) {
    follows[currentUser.email].push(targetEmail);
    saveData("memoFollows", follows);
    showToast("Vous suivez maintenant " + targetEmail);
  }
}

function unfollowUser(targetEmail) {
  if (!follows[currentUser.email]) return;
  follows[currentUser.email] = follows[currentUser.email].filter(e => e !== targetEmail);
  saveData("memoFollows", follows);
  showToast("Vous ne suivez plus " + targetEmail);
}

/* -------------------------------
   Search
------------------------------- */
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

/* -------------------------------
   Hamburger menu
------------------------------- */
function setupMenu() {
  document.querySelectorAll("#hamburger, #hamburger2").forEach(btn => {
    btn.addEventListener("click", () => {
      document.getElementById("sideMenu").classList.toggle("show");
    });
  });

  document.getElementById("closeMenu")?.addEventListener("click", () => {
    document.getElementById("sideMenu").classList.remove("show");
  });
}

/* -------------------------------
   File input handlers
------------------------------- */
function setupFileInputs() {
  const avatarInputs = ["cp_avatar", "avatarUpload"];
  avatarInputs.forEach(id => {
    const input = document.getElementById(id);
    if (input) {
      input.addEventListener("change", e => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = function(evt) {
            updateProfile(currentUser.name, currentUser.email, currentUser.bio, evt.target.result);
          }
          reader.readAsDataURL(file);
        }
      });
    }
  });

  const postImageInput = document.getElementById("composerImage");
  if (postImageInput) {
    postImageInput.addEventListener("change", e => {
      const file = e.target.files[0];
      if (file) {
        document.getElementById("composerImageName").textContent = file.name;
      }
    });
  }
}

/* -------------------------------
   Modal handling
------------------------------- */
function setupModals() {
  document.querySelectorAll("#modalClose").forEach(btn => {
    btn.addEventListener("click", () => {
      document.getElementById("modal").classList.add("hidden");
    });
  });
}

/* -------------------------------
   Initialisation DOM
------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  setupMenu();
  setupFileInputs();
  setupModals();
  renderMiniAvatars();
  renderFeed(currentFeedFilter);

  if (document.body.classList.contains("profile-page")) loadProfilePage();

  document.getElementById("postBtn")?.addEventListener("click", () => {
    const content = document.getElementById("composerText").value;
    const category = document.getElementById("composerCategory").value;
    let image = null;
    const fileInput = document.getElementById("composerImage");
    if (fileInput?.files[0]) {
      const reader = new FileReader();
      reader.onload = function(evt) {
        addPost(content, category, evt.target.result);
      }
      reader.readAsDataURL(fileInput.files[0]);
    } else if (content && category) {
      addPost(content, category);
    }
    document.getElementById("composerText").value = "";
    document.getElementById("composerCategory").value = "";
    document.getElementById("composerImageName").textContent = "";
  });

  document.getElementById("cpCreate")?.addEventListener("click", () => {
    const name = document.getElementById("cp_name").value || currentUser.name;
    const email = document.getElementById("cp_email").value || currentUser.email;
    const bio = document.getElementById("cp_bio").value || currentUser.bio;
    updateProfile(name, email, bio);
    document.getElementById("createProfileOverlay").classList.add("hidden");
  });

  document.getElementById("cpSkip")?.addEventListener("click", () => {
    document.getElementById("createProfileOverlay").classList.add("hidden");
  });

  // Feed buttons
  document.getElementById("feedFriends")?.addEventListener("click", () => renderFeed("friends"));
  document.getElementById("feedGeneral")?.addEventListener("click", () => renderFeed("all"));
  document.getElementById("feedMine")?.addEventListener("click", () => renderFeed("mine"));
});
