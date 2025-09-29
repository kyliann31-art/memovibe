/* MemoVibe — main JS
   - stocke tout dans localStorage
   - users: list of user objects {id,name,email,avatar,bio,following:[],followers:[]}
   - posts: list of posts {id, userId, text, category, date, image, likes:[], comments: [{userId,text,date}]}
*/

/* ---------- Helpers ---------- */
const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
const uid = () => Math.random().toString(36).slice(2,9);
const now = () => new Date().toISOString();
const formatDate = iso => {
  const d = new Date(iso);
  return d.toLocaleString();
}

/* ---------- Storage keys ---------- */
const K_USERS = 'mv_users_v1';
const K_POSTS = 'mv_posts_v1';
const K_CURRENT = 'mv_current_v1';
const K_THEME = 'mv_theme_v1';

/* ---------- Load or seed initial data ---------- */
let users = JSON.parse(localStorage.getItem(K_USERS) || 'null');
let posts = JSON.parse(localStorage.getItem(K_POSTS) || 'null');
let currentUserId = localStorage.getItem(K_CURRENT) || null;

function saveAll(){
  localStorage.setItem(K_USERS, JSON.stringify(users));
  localStorage.setItem(K_POSTS, JSON.stringify(posts));
  localStorage.setItem(K_CURRENT, currentUserId);
}

/* If no data, seed a few users and posts for an alive UI */
if(!users || !posts){
  // create sample users
  users = [
    {id: 'u1', name:'Alex', email:'alex@mail.com', avatar:'https://i.pravatar.cc/80?img=12', bio:'Développeur web', following:['u2'], followers:['u3']},
    {id: 'u2', name:'Marie', email:'marie@mail.com', avatar:'https://i.pravatar.cc/80?img=5', bio:'Photographe', following:['u1','u3'], followers:['u1']},
    {id: 'u3', name:'Léo', email:'leo@mail.com', avatar:'https://i.pravatar.cc/80?img=8', bio:'Étudiant', following:[], followers:['u2']},
  ];
  posts = [
    {id:'p1', userId:'u2', text:'Entretien aujourd’hui ! J’ai appris beaucoup. Conseils ?', category:'travail', date: new Date(Date.now()-3600*1000*36).toISOString(), image:null, likes:['u1'], comments:[{userId:'u1', text:'Bonne chance !', date: now()}]},
    {id:'p2', userId:'u1', text:'Voyage en montagne la semaine dernière : expérience incroyable.', category:'voyage', date: new Date(Date.now()-3600*1000*60).toISOString(), image:null, likes:[], comments:[]},
    {id:'p3', userId:'u3', text:'Rentrée: trouver un stage, stress mais motivé.', category:'études', date: new Date(Date.now()-3600*1000*10).toISOString(), image:null, likes:['u2'], comments:[]}
  ];
  // create a current user (simulate logged in as Alex)
  currentUserId = 'u1';
  localStorage.setItem(K_USERS, JSON.stringify(users));
  localStorage.setItem(K_POSTS, JSON.stringify(posts));
  localStorage.setItem(K_CURRENT, currentUserId);
}

/* ---------- Utility getters ---------- */
function getUserById(id){ return users.find(u => u.id === id); }
function getCurrentUser(){ return getUserById(currentUserId); }
function getPosts(){ return posts.slice(); }

/* ---------- UI Elements ---------- */
const miniAvatar = $('#miniAvatar');
const miniAvatar2 = $('#miniAvatar2'); // profile page
const composerAvatar = $('#composerAvatar');
const sidebarAvatar = $('#sidebarAvatar');
const sidebarName = $('#sidebarName');
const sidebarBio = $('#sidebarBio');
const statPosts = $('#statPosts');
const statFollowing = $('#statFollowing');
const statFollowers = $('#statFollowers');
const statProfilePosts = $('#profilePosts');
const statProfileFollowing = $('#profileFollowing');
const statProfileFollowers = $('#profileFollowers');

/* posts list */
const postsList = $('#postsList');
const recentList = $('#recentList');

/* profile page specific */
const profileName = $('#profileName');
const profileBio = $('#profileBio');
const profileAvatar = $('#profileAvatar');
const userPostsEl = $('#userPosts');
const followingList = $('#followingList');
const followersList = $('#followersList');

/* modal */
const modal = $('#modal');
const modalContent = $('#modalContent');
const modalClose = $('#modalClose');

/* search */
const searchBar = $('#searchBar');
const searchBarProfile = $('#searchBarProfile');

/* feed controls */
const feedTitle = $('#feedTitle');
const navBtns = $$('.nav-btn');

/* composer */
const composerText = $('#composerText');
const composerCategory = $('#composerCategory');
const postBtn = $('#postBtn');
const composerImage = $('#composerImage');

/* profile controls*/
const avatarUpload = $('#avatarUpload');
const editProfileBtn = $('#editProfileBtn');
const profileEdit = $('#profileEdit');
const inputName = $('#inputName');
const inputEmail = $('#inputEmail');
const inputBio = $('#inputBio');
const saveProfile = $('#saveProfile');
const logoutBtn = $('#logoutBtn');

/* search modal chooser state */
let searchMode = null; // 'profile' or 'experience'
let currentFeed = 'friends'; // 'friends' | 'all' | 'me'

/* ---------- Initialize UI ---------- */
document.addEventListener('DOMContentLoaded', ()=> {
  applyTheme();
  wireEvents();
  renderAll();
});

/* ---------- Theme ---------- */
function applyTheme(){
  const t = localStorage.getItem(K_THEME);
  if(t === 'dark'){
    document.body.classList.add('dark-mode');
    $('#themeToggle') && ($('#themeToggle').textContent = '☀️');
    $('#themeToggle2') && ($('#themeToggle2').textContent = '☀️');
  } else {
    document.body.classList.remove('dark-mode');
  }
}
$('#themeToggle') && $('#themeToggle').addEventListener('click', ()=> toggleTheme());
$('#themeToggle2') && $('#themeToggle2').addEventListener('click', ()=> toggleTheme());
function toggleTheme(){
  document.body.classList.toggle('dark-mode');
  const val = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
  localStorage.setItem(K_THEME, val);
  applyTheme();
}

/* ---------- Events wiring ---------- */
function wireEvents(){
  // refresh
  $('#refreshBtn') && $('#refreshBtn').addEventListener('click', ()=>renderAll(true));
  $('#refreshBtn2') && $('#refreshBtn2').addEventListener('click', ()=>renderAll(true));

  // feed nav
  navBtns.forEach(b => b.addEventListener('click', ()=> {
    navBtns.forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    currentFeed = b.dataset.feed;
    feedTitle.textContent = (currentFeed==='friends') ? 'Abonnements' : (currentFeed==='all'? 'Général' : 'Mes posts');
    renderPosts();
  }));

  // search bar: open modal to ask search type
  searchBar && searchBar.addEventListener('click', openSearchChooser);
  searchBarProfile && searchBarProfile.addEventListener('click', openSearchChooser);

  // modal close
  modalClose && modalClose.addEventListener('click', ()=> closeModal());
  modal && modal.addEventListener('click', (e)=> { if(e.target===modal) closeModal(); });

  // post
  postBtn && postBtn.addEventListener('click', handlePost);

  // composer image
  composerImage && composerImage.addEventListener('change', ()=> {
    const f = composerImage.files[0];
    if(!f) return;
    const r = new FileReader();
    r.onload = e => {
      composerImage.dataset.preview = e.target.result;
      showToast('Image attachée');
    };
    r.readAsDataURL(f);
  });

  // profile page actions
  editProfileBtn && editProfileBtn.addEventListener('click', ()=> profileEdit.classList.toggle('hidden'));
  saveProfile && saveProfile.addEventListener('click', saveProfileChanges);
  avatarUpload && avatarUpload.addEventListener('change', handleAvatarUpload);
  logoutBtn && logoutBtn.addEventListener('click', ()=> {
    // simulate logout: choose another user if exists
    const other = users.find(u => u.id !== currentUserId);
    if(other){ currentUserId = other.id; localStorage.setItem(K_CURRENT, currentUserId); showToast('Utilisateur changé (simulé)'); renderAll(); }
  });

  // mini manage lists
  $('#manageFollowing') && $('#manageFollowing').addEventListener('click', ()=> openListModal('following'));
  $('#manageFollowers') && $('#manageFollowers').addEventListener('click', ()=> openListModal('followers'));
}

/* ---------- Rendering ---------- */
function renderAll(force=false){
  // re-load from storage to keep consistent
  users = JSON.parse(localStorage.getItem(K_USERS)) || users;
  posts = JSON.parse(localStorage.getItem(K_POSTS)) || posts;
  currentUserId = localStorage.getItem(K_CURRENT) || currentUserId;

  // update mini avatars and sidebars
  const cur = getCurrentUser();
  $('#miniAvatar') && (miniAvatar.src = cur.avatar || defaultAvatar());
  $('#miniAvatar2') && (miniAvatar2.src = cur.avatar || defaultAvatar());
  $('#composerAvatar') && (composerAvatar.src = cur.avatar || defaultAvatar());
  $('#sidebarAvatar') && (sidebarAvatar.src = cur.avatar || defaultAvatar());
  sidebarName && (sidebarName.textContent = cur.name);
  sidebarBio && (sidebarBio.textContent = cur.bio || '');
  statPosts && (statPosts.textContent = posts.filter(p=>p.userId===currentUserId).length);
  statFollowing && (statFollowing.textContent = cur.following.length);
  statFollowers && (statFollowers.textContent = cur.followers.length);

  // profile page parts
  profileName && (profileName.textContent = cur.name);
  profileBio && (profileBio.textContent = cur.bio || '');
  profileAvatar && (profileAvatar.src = cur.avatar || defaultAvatar());
  statProfilePosts && (statProfilePosts.textContent = posts.filter(p=>p.userId===currentUserId).length);
  statProfileFollowing && (statProfileFollowing.textContent = cur.following.length);
  statProfileFollowers && (statProfileFollowers.textContent = cur.followers.length);

  // lists
  renderCategories();
  renderPosts();
  renderRecent();
  renderUserPosts();
  renderAllUsersInProfile();

  // save
  saveAll();
}

/* ---------- Categories ---------- */
function renderCategories(){
  const cats = Array.from(new Set(posts.map(p=>p.category).filter(Boolean)));
  const container = $('#categoriesList');
  if(!container) return;
  container.innerHTML = '';
  cats.forEach(c=>{
    const el = document.createElement('div');
    el.className = 'chip';
    el.textContent = c;
    el.addEventListener('click', ()=> {
      searchMode = 'experience';
      openSearchModal({ presetCategory: c });
    });
    container.appendChild(el);
  });
}

/* ---------- Posts rendering ---------- */
function renderPosts(){
  if(!postsList) return;
  postsList.innerHTML = '';
  let visible = posts.slice().sort((a,b)=> new Date(b.date) - new Date(a.date)); // newest first

  if(currentFeed === 'friends'){
    const cur = getCurrentUser();
    visible = visible.filter(p => cur.following.includes(p.userId));
  } else if(currentFeed === 'me'){
    visible = visible.filter(p => p.userId === currentUserId);
  } // 'all' shows all

  visible.forEach(p => {
    const li = document.createElement('li');
    li.className = 'post-card';
    li.dataset.id = p.id;

    const user = getUserById(p.userId) || {name:'Utilisateur', avatar: defaultAvatar()};
    const likeCount = p.likes ? p.likes.length : 0;
    const commentCount = p.comments ? p.comments.length : 0;

    li.innerHTML = `
      <div class="post-header">
        <img class="avatar" src="${user.avatar || defaultAvatar()}" alt="avatar">
        <div class="post-meta">
          <div class="name">${escapeHtml(user.name)}</div>
          <div class="when">${formatDate(p.date)}</div>
        </div>
        <div style="margin-left:auto;font-size:12px;color:var(--muted)">#${p.category || 'aucune'}</div>
      </div>
      <div class="post-body">${nl2br(escapeHtml(p.text || ''))}${p.image? `<img class="post-image" src="${p.image}" alt="img">` : ''}</div>
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
      <div class="comments" style="display:${commentCount? 'block':'none'}">
        ${ (p.comments||[]).map(c => {
          const cu = getUserById(c.userId) || {name:'Utilisateur', avatar: defaultAvatar()};
          return `<div class="comment"><img class="avatar" src="${cu.avatar}"><div><strong>${escapeHtml(cu.name)}</strong> <div class="small muted">${formatDate(c.date)}</div><div>${escapeHtml(c.text)}</div></div></div>`;
        }).join('') }
        <div class="comment-box" style="display:flex;gap:8px;margin-top:6px">
          <input class="input-comment" placeholder="Écrire un commentaire..." style="flex:1;padding:8px;border-radius:8px;border:1px solid #e6eef8"/>
          <button class="btn small btn-send-comment">Envoyer</button>
        </div>
      </div>
    `;

    // attach events
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

/* ---------- Recent ---------- */
function renderRecent(){
  if(!recentList) return;
  recentList.innerHTML = '';
  posts.slice().sort((a,b)=> new Date(b.date)-new Date(a.date)).slice(0,6).forEach(p=>{
    const u = getUserById(p.userId);
    const li = document.createElement('li');
    li.className = 'small muted';
    li.textContent = `${u? u.name : 'Utilisateur'} — ${ (p.text||'').slice(0,60) }${(p.text && p.text.length>60)? '…' : ''}`;
    recentList.appendChild(li);
  });
}

/* ---------- User posts (profile) ---------- */
function renderUserPosts(){
  if(!userPostsEl) return;
  userPostsEl.innerHTML = '';
  const myPosts = posts.filter(p => p.userId === currentUserId).sort((a,b)=>new Date(b.date)-new Date(a.date));
  myPosts.forEach(p=>{
    const li = document.createElement('li');
    li.className = 'post-card';
    li.innerHTML = `<div><strong>${p.category || 'aucune'}</strong> • ${formatDate(p.date)}</div><div>${escapeHtml(p.text)}</div>
      <div style="margin-top:8px"><button class="btn-ghost small" data-id="${p.id}">Supprimer</button></div>`;
    li.querySelector('button') && li.querySelector('button').addEventListener('click', ()=> {
      if(confirm('Supprimer ce post ?')) {
        posts = posts.filter(x=>x.id!==p.id);
        saveAndRefresh();
        showToast('Post supprimé');
      }
    });
    userPostsEl.appendChild(li);
  });
}

/* ---------- All users in profile (for following/unfollow) ---------- */
function renderAllUsersInProfile(){
  if(!followingList) return;
  const cur = getCurrentUser();
  // following list
  followingList.innerHTML = '';
  cur.following.forEach(fid=>{
    const u = getUserById(fid);
    if(!u) return;
    const div = document.createElement('div');
    div.className = 'user-card';
    div.innerHTML = `<div style="display:flex;align-items:center;gap:10px"><img src="${u.avatar}" style="width:40px;height:40px;border-radius:8px"><div><strong>${u.name}</strong><div class="small muted">${u.bio||''}</div></div></div>
      <div><button class="btn-ghost small" data-id="${u.id}">Se désabonner</button></div>`;
    div.querySelector('button').addEventListener('click', ()=> {
      unfollowUser(u.id);
    });
    followingList.appendChild(div);
  });

  // followers list
  followersList && (followersList.innerHTML = '');
  followersList && getCurrentUser().followers.forEach(fid=>{
    const u = getUserById(fid);
    if(!u) return;
    const div = document.createElement('div');
    div.className = 'user-card';
    div.innerHTML = `<div style="display:flex;align-items:center;gap:10px"><img src="${u.avatar}" style="width:40px;height:40px;border-radius:8px"><div><strong>${u.name}</strong><div class="small muted">${u.bio||''}</div></div></div>
      <div><button class="btn-ghost small" data-id="${u.id}">Voir</button></div>`;
    div.querySelector('button').addEventListener('click', ()=> openUserProfileModal(u.id));
    followersList.appendChild(div);
  });
}

/* ---------- All users list for profile manage (sidebar) ---------- */
function renderAllUsers(){
  const container = $('#allUsers');
  if(!container) return;
  container.innerHTML = '';
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
    container.appendChild(el);
  });
}

/* ---------- Follow / Unfollow ---------- */
function followUser(targetId){
  const cur = getCurrentUser();
  if(!cur.following.includes(targetId)){
    cur.following.push(targetId);
    const target = getUserById(targetId);
    target.followers.push(cur.id);
    saveAndRefresh();
    showToast('Abonné ✔');
  }
}
function unfollowUser(targetId){
  const cur = getCurrentUser();
  cur.following = cur.following.filter(x=>x!==targetId);
  const target = getUserById(targetId);
  target.followers = (target.followers||[]).filter(x=>x!==cur.id);
  saveAndRefresh();
  showToast('Désabonné');
}

/* ---------- Toggle Like ---------- */
function toggleLike(postId){
  const cur = getCurrentUser();
  const p = posts.find(x=>x.id===postId);
  if(!p) return;
  p.likes = p.likes || [];
  if(p.likes.includes(cur.id)){
    p.likes = p.likes.filter(x=>x!==cur.id);
  } else {
    p.likes.push(cur.id);
  }
  saveAndRefresh();
}

/* ---------- Add comment ---------- */
function addComment(postId, text){
  const p = posts.find(x=>x.id===postId);
  if(!p) return;
  p.comments = p.comments || [];
  p.comments.push({ userId: currentUserId, text: text, date: now() });
  saveAndRefresh();
}

/* ---------- Add reaction (emoji) as comment ---------- */
function addReaction(postId, emoji){
  addComment(postId, emoji);
  showToast('Réaction ajoutée');
}

/* ---------- Create post ---------- */
function handlePost(){
  const text = composerText.value.trim();
  const category = composerCategory.value.trim();
  if(!text){
    alert('Écris une expérience avant de publier.');
    return;
  }
  const image = composerImage.dataset && composerImage.dataset.preview ? composerImage.dataset.preview : null;
  const newPost = { id: 'p'+uid(), userId: currentUserId, text, category, date: now(), image, likes: [], comments: [] };
  posts.unshift(newPost);
  // clear composer
  composerText.value = '';
  composerCategory.value = '';
  delete composerImage.dataset.preview;
  composerImage.value = '';
  saveAndRefresh();
  showToast('Post publié');
}

/* ---------- Avatar upload ---------- */
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

/* ---------- Profile edit ---------- */
function saveProfileChanges(){
  const name = inputName.value.trim();
  const email = inputEmail.value.trim();
  const bio = inputBio.value.trim();
  const cur = getCurrentUser();
  if(name) cur.name = name;
  if(email) cur.email = email;
  cur.bio = bio;
  saveAndRefresh();
  profileEdit.classList.add('hidden');
  showToast('Profil enregistré');
}

/* ---------- Open user profile in modal ---------- */
function openUserProfileModal(userid){
  const u = getUserById(userid);
  if(!u) return;
  modalContent.innerHTML = `
    <div style="display:flex;gap:12px;align-items:center">
      <img src="${u.avatar}" style="width:72px;height:72px;border-radius:12px">
      <div><h3>${escapeHtml(u.name)}</h3><div class="small muted">${escapeHtml(u.bio||'')}</div></div>
    </div>
    <hr>
    <div id="userPostsModal"><h4>Posts de ${escapeHtml(u.name)}</h4></div>
    <div style="margin-top:10px"><button id="followBtn" class="btn small">${ getCurrentUser().following.includes(u.id) ? 'Abonné' : 'Suivre' }</button></div>
  `;
  // posts
  const up = posts.filter(p=>p.userId===u.id).sort((a,b)=>new Date(b.date)-new Date(a.date));
  const upEl = $('#userPostsModal');
  up.forEach(p=>{
    const d = document.createElement('div');
    d.className = 'post-card';
    d.innerHTML = `<div><strong>${p.category||'aucune'}</strong> • ${formatDate(p.date)}</div><div>${escapeHtml(p.text)}</div>`;
    upEl.appendChild(d);
  });
  // follow button
  $('#followBtn').addEventListener('click', ()=>{
    if(getCurrentUser().following.includes(u.id)) { unfollowUser(u.id); $('#followBtn').textContent = 'Suivre'; }
    else { followUser(u.id); $('#followBtn').textContent = 'Abonné'; }
  });

  openModal();
}

/* ---------- Open following/followers list modal ---------- */
function openListModal(which){
  const cur = getCurrentUser();
  let list = which === 'following' ? cur.following : cur.followers;
  modalContent.innerHTML = `<h3>${which === 'following' ? 'Abonnements' : 'Abonnés'}</h3><div id="listModalContent"></div>`;
  const container = $('#listModalContent');
  list.forEach(id=>{
    const u = getUserById(id);
    const el = document.createElement('div');
    el.className = 'user-card';
    el.innerHTML = `<div style="display:flex;align-items:center;gap:10px"><img src="${u.avatar}" style="width:44px;height:44px;border-radius:8px"><div><strong>${u.name}</strong><div class="small muted">${u.bio||''}</div></div></div>
      <div><button class="btn small" data-id="${u.id}">Voir</button></div>`;
    el.querySelector('button').addEventListener('click', ()=> openUserProfileModal(u.id));
    container.appendChild(el);
  });
  openModal();
}

/* ---------- Search chooser & modal ---------- */
function openSearchChooser(){
  modalContent.innerHTML = `
    <h3>Rechercher</h3>
    <div style="display:flex;gap:8px;margin-top:10px">
      <button id="searchByProfile" class="btn">Profil</button>
      <button id="searchByExperience" class="btn btn-ghost">Expérience</button>
    </div>
  `;
  $('#searchByProfile').addEventListener('click', ()=> openSearchModal({ mode:'profile' }));
  $('#searchByExperience').addEventListener('click', ()=> openSearchModal({ mode:'experience' }));
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
      const res = users.filter(u => u.name.toLowerCase().includes(q));
      renderSearchProfiles(res);
    });
  } else {
    // experience search with category
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
    el.innerHTML = `<div style="display:flex;align-items:center;gap:10px"><img src="${u.avatar}" style="width:44px;height:44px;border-radius:8px"><div><strong>${u.name}</strong><div class="small muted">${u.bio||''}</div></div></div>
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
    const u = getUserById(p.userId);
    const el = document.createElement('div');
    el.className = 'post-card';
    el.innerHTML = `<div style="display:flex;gap:10px;align-items:center"><img src="${u.avatar}" style="width:44px;height:44px;border-radius:8px"><div><strong>${u.name}</strong><div class="small muted">${formatDate(p.date)} • ${p.category || ''}</div></div></div><div style="margin-top:8px">${escapeHtml(p.text)}</div>`;
    out.appendChild(el);
  });
}

/* ---------- Modal helpers ---------- */
function openModal(){
  modal.classList.remove('hidden');
}
function closeModal(){ modal.classList.add('hidden'); modalContent.innerHTML = ''; }

/* ---------- Utility: render all users in sidebar profile area ---------- */
function renderAllUsersInProfile(){
  renderAllUsers();
}

/* ---------- Save and Refresh ---------- */
function saveAndRefresh(){
  saveAll();
  renderAll();
}

/* ---------- Modal open helpers ---------- */
function defaultAvatar(){ return 'https://i.pravatar.cc/120?img=1'; }

/* ---------- Helpers escape/html/nl2br ---------- */
function escapeHtml(str){ return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function nl2br(s){ return (s||'').replace(/\n/g,'<br/>'); }

/* ---------- Open profile modal for current user (for quick view) ---------- */
function openUserProfile(userid){
  openUserProfileModal(userid);
}

/* ---------- Search helper public call ---------- */
window.openSearch = openSearchChooser;

/* ---------- Small helpers ---------- */
function getCurrentUser(){ return users.find(u=>u.id === currentUserId);
