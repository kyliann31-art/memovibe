// Minimal, clean, final version.
// LocalStorage keys
const K_USERS = 'mv_users_final_v1';
const K_POSTS = 'mv_posts_final_v1';
const K_CURRENT = 'mv_current_final_v1';
const K_THEME = 'mv_theme_final_v1';

// Helpers
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => Array.from((root || document).querySelectorAll(s));
const uid = () => Math.random().toString(36).slice(2,9);
const nowISO = () => new Date().toISOString();
const fmt = iso => new Date(iso).toLocaleString();
const escapeHTML = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const nl2br = s => (s||'').replace(/\n/g,'<br/>');

// State
let users = JSON.parse(localStorage.getItem(K_USERS) || 'null');
let posts = JSON.parse(localStorage.getItem(K_POSTS) || 'null');
let currentUserId = localStorage.getItem(K_CURRENT) || null;

// Ensure current user exists (single local account, empty by default)
if(!users){
  users = [];
}
if(!currentUserId){
  // create a local account for you (editable). No other fake profiles.
  const me = { id: 'me', name: '', email: '', avatar: '', bio: '', following: [], followers: [] };
  users.push(me);
  currentUserId = me.id;
  saveAll();
}
if(!posts) posts = [];

// Elements
const hamburger = $('#hamburger');
const sideMenu = $('#sideMenu');
const closeMenu = $('#closeMenu');
const themeToggle = $('#themeToggle');
const searchBar = $('#searchBar');
const searchBarProfile = $('#searchBarProfile');
const refreshBtn = $('#refreshBtn');
const refreshBtn2 = $('#refreshBtn2');

const composerAvatar = $('#composerAvatar');
const composerText = $('#composerText');
const composerCategory = $('#composerCategory');
const composerImage = $('#composerImage');
const postBtn = $('#postBtn');

const postsList = $('#postsList');
const recentList = $('#recentList');
const categoriesList = $('#categoriesList');
const feedTitle = $('#feedTitle');
const navBtns = $$('.nav-btn');

const miniAvatar = $('#miniAvatar');
const miniAvatar2 = $('#miniAvatar2');
const sidebarAvatar = $('#sidebarAvatar');
const sidebarName = $('#sidebarName');
const sidebarBio = $('#sidebarBio');
const statPosts = $('#statPosts');
const statFollowing = $('#statFollowing');
const statFollowers = $('#statFollowers');

const modal = $('#modal');
const modalContent = $('#modalContent');
const modalClose = $('#modalClose');
const toastEl = $('#toast');

const profileName = $('#profileName');
const profileBio = $('#profileBio');
const profileAvatar = $('#profileAvatar');
const profilePostsEl = $('#userPosts');
const followingList = $('#followingList');
const followersList = $('#followersList');
const avatarUpload = $('#avatarUpload');
const editProfileBtn = $('#editProfileBtn');
const profileEdit = $('#profileEdit');
const inputName = $('#inputName');
const inputEmail = $('#inputEmail');
const inputBio = $('#inputBio');
const saveProfile = $('#saveProfile');
const logoutBtn = $('#logoutBtn');
const manageFollowing = $('#manageFollowing');
const manageFollowers = $('#manageFollowers');
const allUsersContainer = $('#allUsers');

// Local helpers
function getUser(id){ return users.find(u => u.id === id); }
function getCurrentUser(){ return getUser(currentUserId); }
function saveAll(){ localStorage.setItem(K_USERS, JSON.stringify(users)); localStorage.setItem(K_POSTS, JSON.stringify(posts)); localStorage.setItem(K_CURRENT, currentUserId); }
function defaultAvatar(){ return 'https://i.pravatar.cc/120?img=1'; }

// UI init
document.addEventListener('DOMContentLoaded', () => {
  applyTheme();
  wire();
  renderAll();
});

// Theme
function applyTheme(){
  const t = localStorage.getItem(K_THEME);
  if(t === 'dark') document.body.classList.add('dark-mode');
  else document.body.classList.remove('dark-mode');
}
if(themeToggle) themeToggle.addEventListener('click', ()=> {
  const dark = document.body.classList.toggle('dark-mode');
  localStorage.setItem(K_THEME, dark ? 'dark' : 'light');
});

// Wire events
function wire(){
  if(hamburger) hamburger.addEventListener('click', openSideMenu);
  if(closeMenu) closeMenu.addEventListener('click', closeSideMenu);
  document.addEventListener('click', e => {
    if(sideMenu && sideMenu.classList.contains('show') && !sideMenu.contains(e.target) && !hamburger.contains(e.target)) closeSideMenu();
  });

  navBtns.forEach(b => b.addEventListener('click', ()=> {
    navBtns.forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    currentFeed = b.dataset.feed;
    feedTitle.textContent = (currentFeed === 'friends') ? 'Abonnements' : (currentFeed === 'all' ? 'Général' : 'Mes posts');
    renderPosts();
  }));

  if(searchBar) searchBar.addEventListener('click', openSearchChooser);
  if(searchBarProfile) searchBarProfile.addEventListener('click', openSearchChooser);

  if(refreshBtn) refreshBtn.addEventListener('click', ()=> renderAll(true));
  if(refreshBtn2) refreshBtn2.addEventListener('click', ()=> renderAll(true));

  if(modalClose) modalClose.addEventListener('click', closeModal);
  if(modal) modal.addEventListener('click', e => { if(e.target === modal) closeModal(); });

  if(postBtn) postBtn.addEventListener('click', handlePost);
  if(composerImage) composerImage.addEventListener('change', handleComposerImage);

  if(editProfileBtn) editProfileBtn.addEventListener('click', ()=> profileEdit.classList.toggle('hidden'));
  if(saveProfile) saveProfile.addEventListener('click', saveProfileChanges);
  if(avatarUpload) avatarUpload.addEventListener('change', handleAvatarUpload);
  if(logoutBtn) logoutBtn.addEventListener('click', switchUserQuick);
  if(manageFollowing) manageFollowing.addEventListener('click', ()=> openListModal('following'));
  if(manageFollowers) manageFollowers.addEventListener('click', ()=> openListModal('followers'));
}

// Side menu
function openSideMenu(){ if(sideMenu){ sideMenu.classList.add('show'); sideMenu.classList.remove('hidden'); sideMenu.setAttribute('aria-hidden','false'); } }
function closeSideMenu(){ if(sideMenu){ sideMenu.classList.remove('show'); sideMenu.classList.add('hidden'); sideMenu.setAttribute('aria-hidden','true'); } }

// Rendering
let currentFeed = 'friends';
function renderAll(force=false){
  users = JSON.parse(localStorage.getItem(K_USERS) || '[]');
  posts = JSON.parse(localStorage.getItem(K_POSTS) || '[]');
  currentUserId = localStorage.getItem(K_CURRENT) || currentUserId;

  const cur = getCurrentUser();
  if(!cur) return;

  // avatars & sidebar
  if(miniAvatar) miniAvatar.src = cur.avatar || defaultAvatar();
  if(miniAvatar2) miniAvatar2.src = cur.avatar || defaultAvatar();
  if(composerAvatar) composerAvatar.src = cur.avatar || defaultAvatar();
  if(sidebarAvatar) sidebarAvatar.src = cur.avatar || defaultAvatar();
  if(sidebarName) sidebarName.textContent = cur.name || '—';
  if(sidebarBio) sidebarBio.textContent = cur.bio || '';
  if(statPosts) statPosts.textContent = posts.filter(p=>p.userId===currentUserId).length;
  if(statFollowing) statFollowing.textContent = (cur.following||[]).length;
  if(statFollowers) statFollowers.textContent = (cur.followers||[]).length;

  // profile page
  if(profileName) profileName.textContent = cur.name || '—';
  if(profileBio) profileBio.textContent = cur.bio || '';
  if(profileAvatar) profileAvatar.src = cur.avatar || defaultAvatar();
  if($('#profilePosts')) $('#profilePosts').textContent = posts.filter(p=>p.userId===currentUserId).length;
  if($('#profileFollowing')) $('#profileFollowing').textContent = (cur.following||[]).length;
  if($('#profileFollowers')) $('#profileFollowers').textContent = (cur.followers||[]).length;

  renderCategories();
  renderPosts();
  renderRecent();
  renderUserPosts();
  renderAllUsersInProfile();

  saveAll();
}

function renderCategories(){
  const cats = Array.from(new Set(posts.map(p=>p.category).filter(Boolean)));
  if(!categoriesList) return;
  categoriesList.innerHTML = '';
  cats.forEach(c => {
    const d = document.createElement('div');
    d.className = 'chip';
    d.textContent = c;
    d.addEventListener('click', ()=> openSearchModal({mode:'experience', presetCategory:c}));
    categoriesList.appendChild(d);
  });
}

function renderPosts(){
  if(!postsList) return;
  postsList.innerHTML = '';
  let visible = posts.slice().sort((a,b)=> new Date(b.date) - new Date(a.date));
  const cur = getCurrentUser();
  if(currentFeed === 'friends') visible = visible.filter(p => (cur.following||[]).includes(p.userId));
  else if(currentFeed === 'me') visible = visible.filter(p => p.userId === currentUserId);

  visible.forEach(p => {
    const li = document.createElement('li');
    li.className = 'post-card';
    li.dataset.id = p.id;
    const user = getUser(p.userId) || {name:'Utilisateur', avatar: defaultAvatar()};
    const likeCount = (p.likes||[]).length;
    const commentCount = (p.comments||[]).length;

    li.innerHTML = `
      <div class="post-header">
        <img class="avatar" src="${user.avatar || defaultAvatar()}" alt="avatar">
        <div class="post-meta">
          <div class="name">${escapeHTML(user.name || 'Utilisateur')}</div>
          <div class="when">${fmt(p.date)}</div>
        </div>
        <div style="margin-left:auto;font-size:12px;color:var(--muted)">#${p.category || 'aucune'}</div>
      </div>
      <div class="post-body">${nl2br(escapeHTML(p.text || ''))}${p.image? `<img class="post-image" src="${p.image}" alt="img">` : ''}</div>
      <div class="post-actions">
        <div class="action-left">
          <button class="action-btn btn-like">${likeCount} ♥</button>
          <button class="action-btn btn-comment">💬 ${commentCount}</button>
          <div class="reactions">
            <button class="action-btn btn-react">🙂</button>
            <button class="action-btn btn-react">🔥</button>
            <button class="action-btn btn-react">🎉</button>
          </div>
        </div>
        <div>
          <button class="action-btn btn-view">Voir profil</button>
        </div>
      </div>
      <div class="comments" style="display:${commentCount ? 'block' : 'none'}">
        ${ (p.comments||[]).map(c => {
          const cu = getUser(c.userId) || {name:'Utilisateur', avatar: defaultAvatar()};
          return `<div class="comment"><img class="avatar" src="${cu.avatar}"><div><strong>${escapeHTML(cu.name)}</strong> <div class="small muted">${fmt(c.date)}</div><div>${escapeHTML(c.text)}</div></div></div>`;
        }).join('') }
        <div class="comment-box" style="display:flex;gap:8px;margin-top:6px">
          <input class="input-comment" placeholder="Écrire un commentaire..." style="flex:1;padding:8px;border-radius:8px;border:1px solid #e6eef8"/>
          <button class="btn small btn-send-comment">Envoyer</button>
        </div>
      </div>
    `;

    li.querySelector('.btn-like').addEventListener('click', ()=> toggleLike(p.id));
    li.querySelector('.btn-comment').addEventListener('click', ()=>{
      const comm = li.querySelector('.comments');
      comm.style.display = comm.style.display === 'block' ? 'none' : 'block';
    });
    li.querySelectorAll('.btn-react').forEach(b => b.addEventListener('click', ()=> {
      addReaction(p.id, b.textContent);
    }));
    li.querySelector('.btn-view').addEventListener('click', ()=> openUserProfileModal(p.userId));
    const sendBtn = li.querySelector('.btn-send-comment');
    sendBtn.addEventListener('click', ()=> {
      const input = li.querySelector('.input-comment');
      if(input && input.value.trim()){
        addComment(p.id, input.value.trim());
        input.value = '';
      }
    });

    postsList.appendChild(li);
  });
}

function renderRecent(){
  if(!recentList) return;
  recentList.innerHTML = '';
  posts.slice().sort((a,b)=> new Date(b.date)-new Date(a.date)).slice(0,6).forEach(p=>{
    const u = getUser(p.userId);
    const li = document.createElement('li');
    li.className = 'small muted';
    li.textContent = `${u? u.name : 'Utilisateur'} — ${ (p.text||'').slice(0,60) }${(p.text && p.text.length>60)? '…' : ''}`;
    recentList.appendChild(li);
  });
}

function renderUserPosts(){
  if(!profilePostsEl) return;
  profilePostsEl.innerHTML = '';
  const mine = posts.filter(p => p.userId === currentUserId).sort((a,b)=> new Date(b.date)-new Date(a.date));
  mine.forEach(p=>{
    const li = document.createElement('li');
    li.className = 'post-card';
    li.innerHTML = `<div><strong>${p.category || 'aucune'}</strong> • ${fmt(p.date)}</div><div>${escapeHTML(p.text)}</div>
      <div style="margin-top:8px"><button class="btn-ghost small" data-id="${p.id}">Supprimer</button></div>`;
    li.querySelector('button') && li.querySelector('button').addEventListener('click', ()=> {
      if(confirm('Supprimer ce post ?')) {
        posts = posts.filter(x=>x.id!==p.id);
        saveAndRefresh();
        showToast('Post supprimé');
      }
    });
    profilePostsEl.appendChild(li);
  });
}

function renderAllUsersInProfile(){
  if(!followingList || !followersList) return;
  const cur = getCurrentUser();
  followingList.innerHTML = '';
  (cur.following||[]).forEach(fid=>{
    const u = getUser(fid);
    if(!u) return;
    const d = document.createElement('div');
    d.className = 'user-card';
    d.innerHTML = `<div style="display:flex;align-items:center;gap:10px"><img src="${u.avatar}" style="width:40px;height:40px;border-radius:8px"><div><strong>${u.name}</strong><div class="small muted">${u.bio||''}</div></div></div>
      <div><button class="btn-ghost small" data-id="${u.id}">Se désabonner</button></div>`;
    d.querySelector('button').addEventListener('click', ()=> unfollowUser(u.id));
    followingList.appendChild(d);
  });

  followersList.innerHTML = '';
  (cur.followers||[]).forEach(fid=>{
    const u = getUser(fid);
    if(!u) return;
    const d = document.createElement('div');
    d.className = 'user-card';
    d.innerHTML = `<div style="display:flex;align-items:center;gap:10px"><img src="${u.avatar}" style="width:40px;height:40px;border-radius:8px"><div><strong>${u.name}</strong><div class="small muted">${u.bio||''}</div></div></div>
      <div><button class="btn-ghost small" data-id="${u.id}">Voir</button></div>`;
    d.querySelector('button').addEventListener('click', ()=> openUserProfileModal(u.id));
    followersList.appendChild(d);
  });
}

// All users list (used in profile area if present)
function renderAllUsers(){
  if(!allUsersContainer) return;
  allUsersContainer.innerHTML = '';
  users.forEach(u=>{
    const cur = getCurrentUser();
    if(u.id === cur.id) return;
    const el = document.createElement('div');
    el.className = 'user-card';
    el.innerHTML = `<div style="display:flex;align-items:center"><img src="${u.avatar}" style="width:40px;height:40px;border-radius:8px;margin-right:10px"><div><strong>${u.name}</strong><div class="small muted">${u.bio||''}</div></div></div>
      <div><button class="btn ${cur.following.includes(u.id)? 'btn-ghost' : ''}" data-id="${u.id}">${cur.following.includes(u.id)? 'Abonné' : 'Suivre'}</button></div>`;
    const btn = el.querySelector('button');
    btn.addEventListener('click', ()=> {
      if(cur.following.includes(u.id)) unfollowUser(u.id);
      else followUser(u.id);
    });
    allUsersContainer.appendChild(el);
  });
}

// Actions
function followUser(targetId){
  const cur = getCurrentUser();
  if(!cur.following.includes(targetId)){
    cur.following.push(targetId);
    const tgt = getUser(targetId);
    tgt.followers = tgt.followers || [];
    if(!tgt.followers.includes(cur.id)) tgt.followers.push(cur.id);
    saveAndRefresh();
    showToast('Abonné');
  }
}
function unfollowUser(targetId){
  const cur = getCurrentUser();
  cur.following = (cur.following||[]).filter(x=>x!==targetId);
  const tgt = getUser(targetId);
  if(tgt) tgt.followers = (tgt.followers||[]).filter(x=>x!==cur.id);
  saveAndRefresh();
  showToast('Désabonné');
}

function toggleLike(postId){
  const cur = getCurrentUser();
  const p = posts.find(pp=>pp.id===postId);
  if(!p) return;
  p.likes = p.likes || [];
  if(p.likes.includes(cur.id)) p.likes = p.likes.filter(x=>x!==cur.id);
  else p.likes.push(cur.id);
  saveAndRefresh();
}

function addComment(postId, text){
  const p = posts.find(pp=>pp.id===postId);
  if(!p) return;
  p.comments = p.comments || [];
  p.comments.push({ userId: currentUserId, text, date: nowISO() });
  saveAndRefresh();
}

function addReaction(postId, emoji){
  addComment(postId, emoji);
  showToast('Réaction ajoutée');
}

// Post creation
function handlePost(){
  const text = (composerText && composerText.value || '').trim();
  const category = (composerCategory && composerCategory.value || '').trim();
  if(!text) { alert('Écris une expérience avant de publier.'); return; }
  const image = composerImage && composerImage.dataset && composerImage.dataset.preview ? composerImage.dataset.preview : null;
  const newPost = { id: 'p'+uid(), userId: currentUserId, text, category, date: nowISO(), image, likes: [], comments: [] };
  posts.unshift(newPost);
  composerText.value = '';
  composerCategory.value = '';
  if(composerImage) { delete composerImage.dataset.preview; composerImage.value = ''; }
  saveAndRefresh();
  showToast('Post publié');
}

function handleComposerImage(e){
  const f = composerImage.files && composerImage.files[0];
  if(!f) return;
  const r = new FileReader();
  r.onload = ev => {
    composerImage.dataset.preview = ev.target.result;
    showToast('Image attachée');
  };
  r.readAsDataURL(f);
}

// Avatar upload
function handleAvatarUpload(e){
  const f = e.target.files && e.target.files[0];
  if(!f) return;
  const r = new FileReader();
  r.onload = ev => {
    const cur = getCurrentUser();
    cur.avatar = ev.target.result;
    saveAndRefresh();
    showToast('Avatar mis à jour');
  };
  r.readAsDataURL(f);
}

// Profile edit
function saveProfileChanges(){
  const cur = getCurrentUser();
  if(inputName && inputName.value.trim()) cur.name = inputName.value.trim();
  if(inputEmail && inputEmail.value.trim()) cur.email = inputEmail.value.trim();
  if(inputBio) cur.bio = inputBio.value.trim();
  saveAndRefresh();
  if(profileEdit) profileEdit.classList.add('hidden');
  showToast('Profil enregistré');
}

// Modal / Search
function openModal(){ modal.classList.remove('hidden'); modal.setAttribute('aria-hidden','false'); }
function closeModal(){ modal.classList.add('hidden'); modalContent.innerHTML = ''; modal.setAttribute('aria-hidden','true'); }

function openUserProfileModal(userid){
  const u = getUser(userid);
  if(!u) return;
  modalContent.innerHTML = `
    <div style="display:flex;gap:12px;align-items:center">
      <img src="${u.avatar || defaultAvatar()}" style="width:72px;height:72px;border-radius:12px">
      <div><h3>${escapeHTML(u.name||'—')}</h3><div class="small muted">${escapeHTML(u.bio||'')}</div></div>
    </div>
    <hr>
    <div id="userPostsModal"><h4>Posts de ${escapeHTML(u.name||'—')}</h4></div>
    <div style="margin-top:10px"><button id="followBtn" class="btn small">${ getCurrentUser().following.includes(u.id) ? 'Abonné' : 'Suivre' }</button></div>
  `;
  const up = posts.filter(p=>p.userId===u.id).sort((a,b)=>new Date(b.date)-new Date(a.date));
  const upEl = $('#userPostsModal');
  up.forEach(p=>{
    const d = document.createElement('div');
    d.className = 'post-card';
    d.innerHTML = `<div><strong>${p.category||'aucune'}</strong> • ${fmt(p.date)}</div><div>${escapeHTML(p.text)}</div>`;
    upEl.appendChild(d);
  });
  $('#followBtn').addEventListener('click', ()=>{
    if(getCurrentUser().following.includes(u.id)) { unfollowUser(u.id); $('#followBtn').textContent = 'Suivre'; }
    else { followUser(u.id); $('#followBtn').textContent = 'Abonné'; }
  });
  openModal();
}

function openListModal(which){
  const cur = getCurrentUser();
  const list = which === 'following' ? (cur.following||[]) : (cur.followers||[]);
  modalContent.innerHTML = `<h3>${which === 'following' ? 'Abonnements' : 'Abonnés'}</h3><div id="listModalContent"></div>`;
  const container = $('#listModalContent');
  list.forEach(id => {
    const u = getUser(id);
    if(!u) return;
    const el = document.createElement('div');
    el.className = 'user-card';
    el.innerHTML = `<div style="display:flex;align-items:center;gap:10px"><img src="${u.avatar || defaultAvatar()}" style="width:44px;height:44px;border-radius:8px"><div><strong>${u.name}</strong><div class="small muted">${u.bio||''}</div></div></div>
      <div><button class="btn small" data-id="${u.id}">Voir</button></div>`;
    el.querySelector('button').addEventListener('click', ()=> openUserProfileModal(u.id));
    container.appendChild(el);
  });
  openModal();
}

function openSearchChooser(){
  modalContent.innerHTML = `
    <h3>Rechercher</h3>
    <div style="display:flex;gap:8px;margin-top:10px">
      <button id="searchByProfile" class="btn">Profil</button>
      <button id="searchByExperience" class="btn btn-ghost">Expérience</button>
    </div>
  `;
  $('#searchByProfile').addEventListener('click', ()=> openSearchModal({mode:'profile'}));
  $('#searchByExperience').addEventListener('click', ()=> openSearchModal({mode:'experience'}));
  openModal();
}

function openSearchModal(opts={}){
  const mode = opts.mode || 'experience';
  modalContent.innerHTML = '';
  if(mode === 'profile'){
    modalContent.innerHTML = `<h3>Recherche de profils</h3>
      <input id="srchInput" placeholder="Nom du profil..." style="width:100%;padding:10px;border-radius:8px;border:1px solid #e6eef8"/>
      <div style="margin-top:10px"><button id="srchBtn" class="btn">Rechercher</button></div>
      <div id="srchResults" style="margin-top:12px"></div>`;
    $('#srchBtn').addEventListener('click', ()=> {
      const q = $('#srchInput').value.trim().toLowerCase();
      const res = users.filter(u => (u.name || '').toLowerCase().includes(q));
      renderSearchProfiles(res);
    });
  } else {
    modalContent.innerHTML = `<h3>Recherche d'expériences</h3>
      <div style="display:flex;gap:8px"><input id="srchInputExp" placeholder="Texte..." style="flex:1;padding:10px;border-radius:8px;border:1px solid #e6eef8"/><select id="srchCat"><option value="">Toutes catégories</option><option>travail</option><option>études</option><option>voyage</option><option>santé</option><option>perso</option><option>autre</option></select></div>
      <div style="margin-top:10px"><button id="srchBtnExp" class="btn">Rechercher</button></div>
      <div id="srchResultsExp" style="margin-top:12px"></div>`;
    $('#srchBtnExp').addEventListener('click', ()=> {
      const q = $('#srchInputExp').value.trim().toLowerCase();
      const cat = $('#srchCat').value;
      let res = posts.filter(p => (p.text||'').toLowerCase().includes(q));
      if(cat) res = res.filter(p => p.category === cat);
      renderSearchExperiences(res);
    });
    if(opts.presetCategory) $('#srchCat').value = opts.presetCategory;
  }
  openModal();
}

function renderSearchProfiles(list){
  const out = $('#srchResults');
  out.innerHTML = '';
  if(!list.length){ out.innerHTML = '<div class="muted">Aucun profil trouvé.</div>'; return; }
  list.forEach(u=>{
    const el = document.createElement('div');
    el.className = 'user-card';
    el.innerHTML = `<div style="display:flex;align-items:center;gap:10px"><img src="${u.avatar || defaultAvatar()}" style="width:44px;height:44px;border-radius:8px"><div><strong>${u.name}</strong><div class="small muted">${u.bio||''}</div></div></div>
      <div><button class="btn small" data-id="${u.id}">Voir</button></div>`;
    el.querySelector('button').addEventListener('click', ()=> openUserProfileModal(u.id));
    out.appendChild(el);
  });
}
function renderSearchExperiences(list){
  const out = $('#srchResultsExp');
  out.innerHTML = '';
  if(!list.length){ out.innerHTML = '<div class="muted">Aucune note d\'expérience partagée pour cette recherche.</div>'; return; }
  list.forEach(p=>{
    const u = getUser(p.userId);
    const el = document.createElement('div');
    el.className = 'post-card';
    el.innerHTML = `<div style="display:flex;gap:10px;align-items:center"><img src="${u.avatar || defaultAvatar()}" style="width:44px;height:44px;border-radius:8px"><div><strong>${u.name}</strong><div class="small muted">${fmt(p.date)} • ${p.category || ''}</div></div></div><div style="margin-top:8px">${escapeHTML(p.text)}</div>`;
    out.appendChild(el);
  });
}

// Save & refresh
function saveAndRefresh(){
  saveAll();
  renderAll();
}

// Toast
function showToast(text, ms=1600){
  if(!toastEl) return;
  toastEl.textContent = text;
  toastEl.classList.add('show');
  setTimeout(()=> toastEl.classList.remove('show'), ms);
}

// Quick user switch (simulate another local account if created manually)
function switchUserQuick(){
  const other = users.find(u => u.id !== currentUserId);
  if(other){ currentUserId = other.id; localStorage.setItem(K_CURRENT, currentUserId); showToast('Utilisateur changé (simulé)'); renderAll(); }
}

// Init small (ensure DOM exists)
(function initSmall(){
  const cur = getCurrentUser();
  if(miniAvatar) miniAvatar.src = cur.avatar || defaultAvatar();
  if(miniAvatar2) miniAvatar2.src = cur.avatar || defaultAvatar();
})();
