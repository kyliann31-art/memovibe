/* ==============================
   MemoVibe — script.js final amélioré
   ============================== */

/* -------------------------------
   Helpers : LocalStorage
--------------------------------*/
function saveData(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}
function loadData(key, defaultValue = null) {
  let raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : defaultValue;
}

/* -------------------------------
   Données principales
--------------------------------*/
let currentUser = loadData("memoUser", {
  name: "Utilisateur",
  email: "",
  bio: "",
  photo: ""
});

let posts = loadData("memoPosts", []); // {id, author, authorId, content, category, likes, comments, reactions, date, steps}
let users = loadData("memoUsers", [currentUser]); // tous les profils
let follows = loadData("memoFollows", {}); // { userId: [listIds] }

/* -------------------------------
   Profils
--------------------------------*/
function updateProfile(name, email, bio, photo) {
  currentUser.name = name;
  currentUser.email = email;
  currentUser.bio = bio;
  if(photo) currentUser.photo = photo;

  let idx = users.findIndex(u => u.email === currentUser.email);
  if(idx !== -1){
    users[idx] = currentUser;
  } else {
    users.push(currentUser);
  }

  saveData("memoUser", currentUser);
  saveData("memoUsers", users);
  updateUIProfile();
}

function updateUIProfile(){
  // Mini-profile
  let miniAvatar = document.getElementById("miniAvatar") || document.getElementById("miniAvatar2");
  if(miniAvatar) miniAvatar.src = currentUser.photo || "default-avatar.png";

  // Sidebar
  let sidebarAvatar = document.getElementById("sidebarAvatar");
  if(sidebarAvatar) sidebarAvatar.src = currentUser.photo || "default-avatar.png";
  let sidebarName = document.getElementById("sidebarName");
  if(sidebarName) sidebarName.textContent = currentUser.name;
  let sidebarBio = document.getElementById("sidebarBio");
  if(sidebarBio) sidebarBio.textContent = currentUser.bio;

  let statPosts = document.getElementById("statPosts");
  let statFollowers = document.getElementById("statFollowers");
  let statFollowing = document.getElementById("statFollowing");
  if(statPosts) statPosts.textContent = posts.filter(p => p.authorId === currentUser.email).length;
  if(statFollowers) statFollowers.textContent = Object.values(follows).filter(arr => arr.includes(currentUser.email)).length;
  if(statFollowing) statFollowing.textContent = follows[currentUser.email]?.length || 0;
}

function loadProfilePage(){
  let nameEl = document.getElementById("profileName");
  let bioEl = document.getElementById("profileBio");
  let photoEl = document.getElementById("profileAvatar");
  if(nameEl) nameEl.textContent = currentUser.name;
  if(bioEl) bioEl.textContent = currentUser.bio;
  if(photoEl) photoEl.src = currentUser.photo || "default-avatar.png";

  let postList = document.getElementById("userPosts");
  if(postList){
    postList.innerHTML = "";
    posts.filter(p => p.authorId === currentUser.email).forEach(p => {
      postList.appendChild(renderPost(p));
    });
  }

  updateUIProfile();
}

/* -------------------------------
   Posts
--------------------------------*/
function addPost(content, category, steps=[]){
  if(!content) return;
  let newPost = {
    id: Date.now(),
    author: currentUser.name,
    authorId: currentUser.email,
    content,
    category,
    likes: 0,
    comments: [],
    reactions: [],
    steps,
    date: new Date().toISOString()
  };
  posts.unshift(newPost);
  saveData("memoPosts", posts);
  renderFeed();
}

function likePost(postId){
  let post = posts.find(p => p.id === postId);
  if(post){
    post.likes++;
    saveData("memoPosts", posts);
    renderFeed();
  }
}

function commentPost(postId, text){
  let post = posts.find(p => p.id === postId);
  if(post && text){
    post.comments.push({author: currentUser.name, text});
    saveData("memoPosts", posts);
    renderFeed();
  }
}

function reactPost(postId, emoji){
  let post = posts.find(p => p.id === postId);
  if(post && emoji){
    post.reactions.push({author: currentUser.name, emoji});
    saveData("memoPosts", posts);
    renderFeed();
  }
}

/* -------------------------------
   Render Post
--------------------------------*/
function renderPost(post){
  let li = document.createElement("div");
  li.className = "post-card";

  // Steps
  let stepsHTML = "";
  if(post.steps && post.steps.length){
    stepsHTML = `<div class="post-steps">` + post.steps.map(s => `<div class="post-step">• ${s}</div>`).join("") + `</div>`;
  }

  li.innerHTML = `
    <div class="post-header">
      <img class="avatar" src="${getUserPhoto(post.authorId)}" alt="avatar">
      <div class="post-author">${post.author}</div>
      <div class="post-date">${new Date(post.date).toLocaleString()}</div>
    </div>
    <div class="post-content">${post.content}</div>
    ${stepsHTML}
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
      ${post.reactions.map(r => `<span class="post-emotion">${r.emoji}</span>`).join(" ")}
    </div>
  `;

  li.querySelector(".btn-like").addEventListener("click", () => likePost(post.id));
  li.querySelector(".btn-comment").addEventListener("click", () => {
    let text = prompt("Votre commentaire :");
    if(text) commentPost(post.id, text);
  });
  li.querySelector(".btn-react").addEventListener("click", () => {
    let emoji = prompt("Entrez un emoji :");
    if(emoji) reactPost(post.id, emoji);
  });

  return li;
}

function getUserPhoto(email){
  let u = users.find(u => u.email === email);
  return u?.photo || "default-avatar.png";
}

/* -------------------------------
   Feed
--------------------------------*/
function renderFeed(filter="friends"){
  let feed = document.getElementById("postsList") || document.getElementById("feed");
  if(!feed) return;

  feed.innerHTML = "";

  let visiblePosts = [];
  if(filter === "friends"){
    let following = follows[currentUser.email] || [];
    visiblePosts = posts.filter(p => following.includes(p.authorId));
  } else if(filter === "mine"){
    visiblePosts = posts.filter(p => p.authorId === currentUser.email);
  } else {
    visiblePosts = posts;
  }

  if(visiblePosts.length === 0){
    feed.innerHTML = "<p>Aucune expérience partagée pour le moment.</p>";
    return;
  }

  visiblePosts.forEach(p => feed.appendChild(renderPost(p)));
}

/* -------------------------------
   Follows
--------------------------------*/
function followUser(email){
  if(!follows[currentUser.email]) follows[currentUser.email] = [];
  if(!follows[currentUser.email].includes(email)){
    follows[currentUser.email].push(email);
    saveData("memoFollows", follows);
  }
}

function unfollowUser(email){
  if(!follows[currentUser.email]) return;
  follows[currentUser.email] = follows[currentUser.email].filter(e => e !== email);
  saveData("memoFollows", follows);
}

/* -------------------------------
   Recherche
--------------------------------*/
function search(type, query, category=null){
  if(type === "profile"){
    return users.filter(u => u.name.toLowerCase().includes(query.toLowerCase()));
  } else if(type === "experience"){
    return posts.filter(p => {
      let matchText = p.content.toLowerCase().includes(query.toLowerCase());
      let matchCat = category ? p.category === category : true;
      return matchText && matchCat;
    });
  }
  return [];
}

/* -------------------------------
   Menu
--------------------------------*/
function setupMenu(){
  let btns = document.querySelectorAll("#hamburger, #hamburger2");
  let menu = document.getElementById("sideMenu");
  let closeBtn = document.getElementById("closeMenu");

  btns.forEach(btn => btn.addEventListener("click", () => {
    if(menu) menu.classList.toggle("show");
  }));
  if(closeBtn) closeBtn.addEventListener("click", () => menu.classList.remove("show"));
}

/* -------------------------------
   Initialisation
--------------------------------*/
document.addEventListener("DOMContentLoaded", () => {
  setupMenu();
  updateUIProfile();
  renderFeed("friends");

  if(document.body.classList.contains("profile-main")){
    loadProfilePage();
  }

  // Composer
  let postBtn = document.getElementById("postBtn");
  if(postBtn){
    postBtn.addEventListener("click", () => {
      let content = document.getElementById("composerText").value;
      let category = document.getElementById("composerCategory").value;
      if(content && category){
        // steps (nouvelle fonctionnalité)
        let steps = [];
        document.querySelectorAll(".composer-step").forEach(s => {
          if(s.value) steps.push(s.value);
        });
        addPost(content, category, steps);
        document.getElementById("composerText").value = "";
        document.getElementById("composerCategory").value = "";
      }
    });
  }
});
