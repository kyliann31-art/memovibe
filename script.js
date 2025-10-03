/* =============================================
   MemoVibe - script.js (version complète prête)
   - Compatible avec index.html & profile.html fournis
   - Stocke tout dans localStorage (clé 'memoVibe_*')
   - Gère profils, posts (image base64), likes, comments, reactions animées,
     défis, notifications et panneau Paramètres injecté.
   ============================================= */

/* ===================
   Utilitaires & stockage
   =================== */
const LS_PREFIX = "memoVibe_";
const ls = {
  get(k, def = null) { try { const raw = localStorage.getItem(LS_PREFIX + k); return raw ? JSON.parse(raw) : def; } catch(e){ return def; } },
  set(k, v) { try { localStorage.setItem(LS_PREFIX + k, JSON.stringify(v)); } catch(e){} }
};

function uid(prefix = "id") { return prefix + "_" + Math.random().toString(36).slice(2,10); }
function nowISO() { return new Date().toISOString(); }
function escapeHtml(s = "") {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[c]));
}

/* ===================
   Données par défaut & initialisation
   =================== */
let settings = ls.get("settings", {
  animations: true,
  showImages: true,
  compactMode: false
});

let users = ls.get("users", []); // { id, name, email, bio, photo }
let currentUser = ls.get("currentUser", null); // id de l'utilisateur courant stocké l'objet
let posts = ls.get("posts", []); // { id, authorId, authorName, content, category, image, likes, comments[], reactions[], date }
let follows = ls.get("follows", {}); // { userId: [userId,...] }
let points = ls.get("points", {}); // { userId: number }
let challenges = ls.get("challenges", []); // { id, title, description, completedBy: [] }
let notifications = ls.get("notifications", []); // { id, text, date, read }

/* Si pas d'utilisateur courant, créer un compte local par défaut */
if(!currentUser) {
  const defaultUser = { id: uid("user"), name: "Utilisateur", email: "", bio: "", photo: "default-avatar.png" };
  users.push(defaultUser);
  currentUser = defaultUser;
  ls.set("users", users);
  ls.set("currentUser", currentUser);
}

/* Garanties */
if(!Array.isArray(posts)) posts = [];
if(!Array.isArray(challenges)) challenges = [];
if(typeof follows !== "object") follows = {};
if(typeof points !== "object") points = {};
if(!points[currentUser.id]) points[currentUser.id] = 0;

/* ===================
   Helpers IO (fichiers -> base64)
   =================== */
function fileToBase64(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

/* ===================
   Notifications & Toast
   =================== */
function pushNotification(text) {
  notifications.unshift({ id: uid("n"), text, date: nowISO(), read: false });
  notifications = notifications.slice(0, 100);
  ls.set("notifications", notifications);
  renderNotifications();
}
function showToast(text, timeout = 2400) {
  const t = document.getElementById("toast");
  if(!t) return;
  t.textContent = text;
  t.classList.add("show");
  setTimeout(()=> t.classList.remove("show"), timeout);
}

/* ===================
   Posts: création / interaction
   =================== */
async function addPost(content, category = "autre", imageFileOrBase64 = null) {
  if(!content || !content.trim()) { showToast("Le contenu est vide."); return; }
  let imageData = null;
  if(imageFileOrBase64) {
    if(typeof imageFileOrBase64 === "string") imageData = imageFileOrBase64;
    else imageData = await fileToBase64(imageFileOrBase64);
  }
  const p = {
    id: Date.now(),
    authorId: currentUser.id,
    authorName: currentUser.name,
    content: content.trim(),
    category: category || "autre",
    image: imageData,
    likes: 0,
    comments: [],
    reactions: [],
    date: nowISO()
  };
  posts.unshift(p);
  ls.set("posts", posts);
  pushNotification(`${currentUser.name} a publié une expérience.`);
  renderFeed(currentFeedFilter || "all");
  renderSidebarProfile();
  showToast("Expérience publiée !");
}

/* Like / comment / react */
function likePost(postId) {
  const p = posts.find(x => x.id === postId);
  if(!p) return;
  p.likes = (p.likes || 0) + 1;
  ls.set("posts", posts);
  renderFeed(currentFeedFilter || "all");
}
function commentPost(postId, text) {
  if(!text || !text.trim()) return;
  const p = posts.find(x => x.id === postId);
  if(!p) return;
  p.comments.push({ id: uid("c"), author: currentUser.name, text: text.trim(), date: nowISO() });
  ls.set("posts", posts);
  renderFeed(currentFeedFilter || "all");
}
function reactPost(postId, emoji) {
  if(!emoji) return;
  const p = posts.find(x => x.id === postId);
  if(!p) return;
  p.reactions.push({ id: uid("r"), author: currentUser.name, emoji, date: nowISO() });
  ls.set("posts", posts);
  renderFeed(currentFeedFilter || "all");
}

/* Reaction animée */
function reactPostAnimated(postId, emoji) {
  reactPost(postId, emoji);
  if(!settings.animations) return;
  const el = document.querySelector(`.post-card[data-id='${postId}']`);
  if(!el) return;
  const span = document.createElement("span");
  span.className = "floating-emoji";
  span.textContent = emoji;
  el.appendChild(span);
  setTimeout(()=> span.remove(), 1400);
}

/* ===================
   Render Post (DOM)
   =================== */
function renderPostElement(p) {
  const div = document.createElement("div");
  div.className = "post-card";
  div.dataset.id = p.id;

  const dateStr = new Date(p.date).toLocaleString();
  const commentsHtml = (p.comments || []).map(c => `<p class="comment"><strong>${escapeHtml(c.author)}:</strong> ${escapeHtml(c.text)}</p>`).join("");
  const reactionsHtml = (p.reactions || []).map(r => `<span class="reaction">${escapeHtml(r.emoji)}</span>`).join(" ");

  div.innerHTML = `
    <div class="post-header">
      <div class="post-author">${escapeHtml(p.authorName)}</div>
      <div class="post-date">${escapeHtml(dateStr)}</div>
    </div>
    <div class="post-content">${escapeHtml(p.content)}</div>
    ${ (p.image && settings.showImages) ? `<div class="post-image"><img src="${p.image}" alt="image" /></div>` : "" }
    <div class="post-category">Catégorie : ${escapeHtml(p.category)}</div>
    <div class="post-actions">
      <button class="btn-like action-btn">👍 ${p.likes || 0}</button>
      <button class="btn-comment action-btn">💬 ${(p.comments || []).length}</button>
      <button class="btn-react action-btn">😀</button>
    </div>
    <div class="post-comments">${commentsHtml}</div>
    <div class="post-reactions">${reactionsHtml}</div>
  `;

  // handlers
  const likeBtn = div.querySelector(".btn-like");
  const commentBtn = div.querySelector(".btn-comment");
  const reactBtn = div.querySelector(".btn-react");

  likeBtn && likeBtn.addEventListener("click", () => {
    likePost(p.id);
  });

  commentBtn && commentBtn.addEventListener("click", async () => {
    const txt = prompt("Votre commentaire :");
    if(txt) commentPost(p.id, txt);
  });

  reactBtn && reactBtn.addEventListener("click", () => {
    const emoji = prompt("Entrez un emoji pour réagir :");
    if(emoji) reactPostAnimated(p.id, emoji);
  });

  return div;
}

/* ===================
   Feed rendering
   =================== */
let currentFeedFilter = "all"; // 'all' | 'mine' | 'friends'
function renderFeed(filter = "all") {
  currentFeedFilter = filter;
  const container = document.getElementById("feedContainer") || document.getElementById("feedPosts") || document.getElementById("feedPostsContainer");
  if(!container) return;
  container.innerHTML = "";

  let visible = [];
  if(filter === "mine") {
    visible = posts.filter(p => p.authorId === currentUser.id);
  } else if(filter === "friends") {
    const following = follows[currentUser.id] || [];
    visible = posts.filter(p => following.includes(p.authorId));
  } else {
    visible = posts;
  }

  if(visible.length === 0) {
    container.innerHTML = "<p>Aucune expérience pour le moment.</p>";
    renderChallenges(); // toujours afficher défis
    return;
  }

  visible.forEach(p => {
    container.appendChild(renderPostElement(p));
  });

  renderChallenges();
}

/* ===================
   Challenges
   =================== */
function addChallenge(title, description) {
  const c = { id: Date.now(), title, description, completedBy: [] };
  challenges.unshift(c);
  ls.set("challenges", challenges);
  renderChallenges();
}
function completeChallenge(id) {
  const c = challenges.find(x => x.id === id);
  if(!c) return;
  if(!c.completedBy.includes(currentUser.id)) {
    c.completedBy.push(currentUser.id);
    points[currentUser.id] = (points[currentUser.id] || 0) + 10;
    ls.set("challenges", challenges);
    ls.set("points", points);
    showToast("Défi complété ! +10 points 🎉");
    pushNotification(`Vous avez complété le défi "${c.title}"`);
    renderChallenges();
    renderSidebarProfile();
  }
}
function renderChallenges() {
  const feed = document.getElementById("challenges") || document.getElementById("dailyChallenges") || null;
  if(!feed) return;
  feed.innerHTML = "";
  (challenges.slice(0, 6)).forEach(c => {
    const div = document.createElement("div");
    div.className = "challenge-item";
    const done = c.completedBy.includes(currentUser.id);
    div.innerHTML = `<strong>${escapeHtml(c.title)}</strong><p>${escapeHtml(c.description)}</p>`;
    const btn = document.createElement("button");
    btn.className = "btn-challenge";
    btn.textContent = done ? "✅ Complété" : "Relever";
    btn.disabled = done;
    btn.addEventListener("click", () => completeChallenge(c.id));
    div.appendChild(btn);
    feed.appendChild(div);
  });
}

/* ===================
   Notifications render
   =================== */
function renderNotifications() {
  const container = document.getElementById("notifications") || document.getElementById("notificationsProfile");
  if(!container) return;
  container.innerHTML = "";
  notifications.slice(0, 20).forEach(n => {
    const div = document.createElement("div");
    div.className = "notification-item";
    div.textContent = `${n.text} — ${new Date(n.date).toLocaleTimeString()}`;
    container.appendChild(div);
  });
}

/* ===================
   Profile / sidebar render
   =================== */
function renderSidebarProfile() {
  const nameEl = document.getElementById("sidebarName");
  const bioEl = document.getElementById("sidebarBio");
  const photoEl = document.getElementById("sidebarAvatar");
  const statPosts = document.getElementById("statPosts");
  const statFollowers = document.getElementById("statFollowers");
  const statFollowing = document.getElementById("statFollowing");
  const statPoints = document.getElementById("statPoints");

  if(nameEl) nameEl.textContent = currentUser.name;
  if(bioEl) bioEl.textContent = currentUser.bio || "—";
  if(photoEl) photoEl.src = currentUser.photo || "default-avatar.png";

  if(statPosts) statPosts.textContent = posts.filter(p => p.authorId === currentUser.id).length;
  if(statFollowers) statFollowers.textContent = Object.values(follows).filter(arr => arr && arr.includes(currentUser.id)).length;
  if(statFollowing) statFollowing.textContent = (follows[currentUser.id] || []).length;
  if(statPoints) statPoints.textContent = (points[currentUser.id] || 0);
}

/* Load profile page view (profile.html) */
function loadProfilePageView() {
  const nameEl = document.getElementById("profileName");
  if(!nameEl) return; // pas sur profile.html
  document.getElementById("profileName").textContent = currentUser.name;
  document.getElementById("profileBio").textContent = currentUser.bio || "";
  document.getElementById("profileAvatar").src = currentUser.photo || "default-avatar.png";
  document.getElementById("profilePosts").textContent = posts.filter(p => p.authorId === currentUser.id).length;
  document.getElementById("profileFollowers").textContent = Object.values(follows).filter(arr => arr && arr.includes(currentUser.id)).length;
  document.getElementById("profileFollowing").textContent = (follows[currentUser.id] || []).length;
  document.getElementById("profilePoints").textContent = (points[currentUser.id] || 0);

  // user posts
  const userPosts = document.getElementById("userPosts");
  if(userPosts) {
    userPosts.innerHTML = "";
    posts.filter(p => p.authorId === currentUser.id).forEach(p => userPosts.appendChild(renderPostElement(p)));
  }

  // following / followers lists
  const followingList = document.getElementById("followingList");
  const followersList = document.getElementById("followersList");
  if(followingList) followingList.innerHTML = "";
  if(followersList) followersList.innerHTML = "";
  users.forEach(u => {
    if(u.id === currentUser.id) return;
    const item = document.createElement("div");
    item.className = "small muted";
    item.textContent = u.name || u.id;
    if(followingList && (follows[currentUser.id] || []).includes(u.id)) followingList.appendChild(item.cloneNode(true));
    if(followersList && (follows[u.id] || []).includes(currentUser.id)) followersList.appendChild(item.cloneNode(true));
  });

  // notifications profile
  const notifProfile = document.getElementById("notificationsProfile");
  if(notifProfile) {
    notifProfile.innerHTML = "";
    notifications.slice(0, 10).forEach(n => {
      const d = document.createElement("div");
      d.className = "notification-item";
      d.textContent = `${n.text} — ${new Date(n.date).toLocaleTimeString()}`;
      notifProfile.appendChild(d);
    });
  }

  // daily challenges list
  const daily = document.getElementById("dailyChallenges");
  if(daily) {
    daily.innerHTML = "";
    challenges.slice(0,10).forEach(c => {
      const li = document.createElement("li");
      li.textContent = `${c.title} ${c.completedBy.includes(currentUser.id) ? '✅' : ''}`;
      daily.appendChild(li);
    });
  }
}

/* ===================
   Follow / Unfollow
   =================== */
function followUser(userId) {
  if(!follows[currentUser.id]) follows[currentUser.id] = [];
  if(!follows[currentUser.id].includes(userId)) {
    follows[currentUser.id].push(userId);
    ls.set("follows", follows);
    pushNotification(`Vous suivez ${userId}`);
    renderSidebarProfile();
  }
}
function unfollowUser(userId) {
  if(!follows[currentUser.id]) return;
  follows[currentUser.id] = follows[currentUser.id].filter(x => x !== userId);
  ls.set("follows", follows);
  pushNotification(`Vous avez arrêté de suivre ${userId}`);
  renderSidebarProfile();
}

/* ===================
   Paramètres (injection UI si absent)
   =================== */
function ensureSettingsPanel() {
  if(document.getElementById("settingsPanel")) return;
  const btn = document.createElement("button");
  btn.id = "settingsBtn";
  btn.className = "icon-btn";
  btn.title = "Paramètres";
  btn.innerHTML = "⚙️";
  btn.style.position = "fixed";
  btn.style.right = "16px";
  btn.style.bottom = "16px";
  btn.style.zIndex = 200;
  btn.addEventListener("click", () => {
    const panel = document.getElementById("settingsPanel");
    if(panel) panel.classList.toggle("hidden");
  });
  document.body.appendChild(btn);

  const panel = document.createElement("div");
  panel.id = "settingsPanel";
  panel.className = "overlay hidden";
  panel.style.alignItems = "flex-end";
  panel.style.justifyContent = "flex-end";
  panel.innerHTML = `
    <div class="card" style="width:320px;padding:14px;margin:20px;">
      <h3>Paramètres</h3>
      <div style="margin-bottom:8px">
        <label><input type="checkbox" id="setting_animations"> Activer animations</label>
      </div>
      <div style="margin-bottom:8px">
        <label><input type="checkbox" id="setting_showImages"> Afficher images</label>
      </div>
      <div style="margin-bottom:8px">
        <label><input type="checkbox" id="setting_compact"> Mode compact</label>
      </div>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:10px">
        <button id="closeSettings" class="btn-ghost">Fermer</button>
      </div>
    </div>
  `;
  document.body.appendChild(panel);

  // populate values
  document.getElementById("setting_animations").checked = !!settings.animations;
  document.getElementById("setting_showImages").checked = !!settings.showImages;
  document.getElementById("setting_compact").checked = !!settings.compactMode;

  // handlers
  document.getElementById("setting_animations").addEventListener("change", (e) => {
    settings.animations = e.target.checked; ls.set("settings", settings);
  });
  document.getElementById("setting_showImages").addEventListener("change", (e) => {
    settings.showImages = e.target.checked; ls.set("settings", settings); renderFeed(currentFeedFilter);
  });
  document.getElementById("setting_compact").addEventListener("change", (e) => {
    settings.compactMode = e.target.checked; ls.set("settings", settings); document.body.classList.toggle("compact", settings.compactMode);
  });
  document.getElementById("closeSettings").addEventListener("click", () => panel.classList.add("hidden"));
}

/* ===================
   Création / édition de profil
   =================== */
async function createOrUpdateProfileFromOverlay() {
  const name = document.getElementById("cp_name") ? document.getElementById("cp_name").value.trim() : "";
  const email = document.getElementById("cp_email") ? document.getElementById("cp_email").value.trim() : "";
  const bio = document.getElementById("cp_bio") ? document.getElementById("cp_bio").value.trim() : "";
  const avatarInput = document.getElementById("cp_avatar");
  if(avatarInput && avatarInput.files && avatarInput.files[0]) {
    const b64 = await fileToBase64(avatarInput.files[0]);
    currentUser.photo = b64 || currentUser.photo;
  }
  if(name) currentUser.name = name;
  if(email) currentUser.email = email;
  if(bio) currentUser.bio = bio;

  // update users list (replace or push)
  const idx = users.findIndex(u => u.id === currentUser.id);
  if(idx >= 0) users[idx] = currentUser;
  else users.push(currentUser);
  ls.set("users", users);
  ls.set("currentUser", currentUser);
  showToast("Profil mis à jour !");
  renderSidebarProfile();
  loadProfilePageView();
  document.getElementById("createProfileOverlay")?.classList.add("hidden");
}

/* ===================
   Seed demo (optionnel)
   =================== */
function ensureSeedData() {
  if(posts.length === 0 && users.length <= 2) {
    // créer quelques utilisateurs de démonstration
    const u1 = users[0] || currentUser;
    const u2 = { id: uid("user"), name: "Alice", email: "alice@example.com", bio: "Voyageuse", photo: "default-avatar.png" };
    const u3 = { id: uid("user"), name: "Bob", email: "bob@example.com", bio: "Cycliste", photo: "default-avatar.png" };
    if(!users.find(u=>u.id===u2.id)) users.push(u2);
    if(!users.find(u=>u.id===u3.id)) users.push(u3);
    ls.set("users", users);

    posts.unshift({
      id: Date.now() - 5000,
      authorId: u2.id, authorName: u2.name,
      content: "Mon premier post sur MemoVibe : le lever de soleil était incroyable 🌅",
      category: "voyage", image: null, likes: 2, comments: [], reactions: [], date: nowISO()
    });
    posts.unshift({
      id: Date.now() - 3000,
      authorId: u3.id, authorName: u3.name,
      content: "J'ai battu mon record de montée aujourd'hui ! 🚴‍♂️",
      category: "sport", image: null, likes: 5, comments: [], reactions: [], date: nowISO()
    });
    ls.set("posts", posts);

    // quelques défis
    if(challenges.length === 0) {
      challenges.push({ id: Date.now()+1, title: "Partage une victoire", description: "Raconte une petite victoire de ta journée.", completedBy: [] });
      challenges.push({ id: Date.now()+2, title: "Beau souvenir", description: "Partage une photo d’un bon souvenir.", completedBy: [] });
      ls.set("challenges", challenges);
    }
  }
}

/* ===================
   Sauvegarde globale (appel après modifications massives)
   =================== */
function saveAll() {
  ls.set("users", users);
  ls.set("posts", posts);
  ls.set("follows", follows);
  ls.set("points", points);
  ls.set("challenges", challenges);
  ls.set("notifications", notifications);
  ls.set("settings", settings);
  ls.set("currentUser", currentUser);
}

/* ===================
   Intialisation DOM & handlers
   =================== */
document.addEventListener("DOMContentLoaded", () => {
  // inject settings panel
  ensureSettingsPanel();

  // seed demo data on first run (help test)
  ensureSeedData();

  // render initial UI
  renderSidebarProfile();
  renderNotifications();
  renderFeed(currentFeedFilter || "all");
  loadProfilePageView();

  // Composer handlers (index.html)
  const postBtn = document.getElementById("postBtn");
  const composerText = document.getElementById("composerText");
  const composerCategory = document.getElementById("composerCategory");
  const composerImage = document.getElementById("composerImage");
  let pendingImage = null;

  if(composerImage) {
    composerImage.addEventListener("change", async (e) => {
      const f = e.target.files && e.target.files[0];
      if(!f) return;
      pendingImage = await fileToBase64(f);
      const span = document.getElementById("composerImageName");
      if(span) span.textContent = f.name;
    });
  }

  if(postBtn) {
    postBtn.addEventListener("click", async () => {
      const content = composerText ? composerText.value : "";
      const cat = composerCategory ? composerCategory.value : "autre";
      await addPost(content, cat, pendingImage);
      // reset composer
      if(composerText) composerText.value = "";
      if(composerCategory) composerCategory.selectedIndex = 0;
      if(document.getElementById("composerImageName")) document.getElementById("composerImageName").textContent = "";
      pendingImage = null;
    });
  }

  // menu create profile overlay
  const menuCreate = document.getElementById("menuCreateAccount");
  if(menuCreate) menuCreate.addEventListener("click", () => {
    const overlay = document.getElementById("createProfileOverlay");
    if(overlay) overlay.classList.remove("hidden");
  });
  const cpCreate = document.getElementById("cpCreate");
  if(cpCreate) cpCreate.addEventListener("click", createOrUpdateProfileFromOverlay);
  const cpSkip = document.getElementById("cpSkip");
  if(cpSkip) cpSkip.addEventListener("click", () => document.getElementById("createProfileOverlay")?.classList.add("hidden"));

  // profile page edit
  const editBtn = document.getElementById("editProfileBtn");
  if(editBtn) {
    editBtn.addEventListener("click", () => {
      const form = document.getElementById("profileEdit");
      if(form) form.classList.toggle("hidden");
    });
  }
  const saveProfileBtn = document.getElementById("saveProfile");
  if(saveProfileBtn) {
    saveProfileBtn.addEventListener("click", async () => {
      const n = document.getElementById("inputName")?.value || currentUser.name;
      const e = document.getElementById("inputEmail")?.value || currentUser.email;
      const b = document.getElementById("inputBio")?.value || currentUser.bio;
      currentUser.name = n; currentUser.email = e; currentUser.bio = b;
      // update users list
      const idx = users.findIndex(u => u.id === currentUser.id);
      if(idx >= 0) users[idx] = currentUser; else users.push(currentUser);
      saveAll();
      renderSidebarProfile();
      loadProfilePageView();
      showToast("Profil enregistré !");
    });
  }

  // feed filters (if present)
  const btnFriends = document.getElementById("feedFriends");
  const btnGeneral = document.getElementById("feedGeneral");
  const btnMine = document.getElementById("feedMine");
  if(btnFriends) btnFriends.addEventListener("click", () => renderFeed("friends"));
  if(btnGeneral) btnGeneral.addEventListener("click", () => renderFeed("all"));
  if(btnMine) btnMine.addEventListener("click", () => renderFeed("mine"));

  // refresh buttons
  const refresh = document.getElementById("refreshBtn");
  const refresh2 = document.getElementById("refreshBtn2");
  if(refresh) refresh.addEventListener("click", () => { renderFeed(currentFeedFilter); showToast("Rafraîchi"); });
  if(refresh2) refresh2.addEventListener("click", () => { renderFeed(currentFeedFilter); showToast("Rafraîchi"); });

  // close menu overlay if clicking outside
  document.addEventListener("click", (e) => {
    const overlay = document.getElementById("createProfileOverlay");
    if(overlay && !overlay.classList.contains("hidden") && e.target === overlay) overlay.classList.add("hidden");
  });

  // window unload: persist everything
  window.addEventListener("beforeunload", () => { saveAll(); });
});

/* ===================
   End of file
   =================== */
