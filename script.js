/* =========================
   MemoVibe JS — social style
   ========================= */

/* ---------- Helpers ---------- */
const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
const uid = () => Math.random().toString(36).slice(2,9);
const nowStr = () => new Date().toLocaleString();

/* ---------- Keys & State ---------- */
const LS = {
  THEME: 'memo_theme_v2',
  PROFILE: 'memo_profile_v2',
  POSTS:  'memo_posts_v2'
};

let state = {
  profile: null,
  posts: []
};

/* ---------- Init ---------- */
document.addEventListener('DOMContentLoaded', init);

function init(){
  loadTheme();
  loadProfile();
  loadPosts();
  wireUI();
  renderAll();
}

/* ---------- THEME ---------- */
function loadTheme(){
  const t = localStorage.getItem(LS.THEME);
  if(t === 'dark') document.body.classList.add('dark');
  updateThemeButton();
}
function toggleTheme(){
  document.body.classList.toggle('dark');
  localStorage.setItem(LS.THEME, document.body.classList.contains('dark') ? 'dark' : 'light');
  updateThemeButton();
}
function updateThemeButton(){
  const btns = $$('#toggleTheme');
  btns.forEach(b => b.innerText = document.body.classList.contains('dark') ? '☀️' : '🌙');
}

/* ---------- PROFILE ---------- */
function loadProfile(){
  const raw = localStorage.getItem(LS.PROFILE);
  if(raw){
    state.profile = JSON.parse(raw);
  } else {
    state.profile = { name: '', email: '', avatar: null };
    localStorage.setItem(LS.PROFILE, JSON.stringify(state.profile));
  }
  fillProfileUI();
}
function saveProfile(p){
  state.profile = {...state.profile, ...p};
  localStorage.setItem(LS.PROFILE, JSON.stringify(state.profile));
  fillProfileUI();
  showToast('Profil mis à jour');
}
function resetProfile(){
  if(!confirm('Supprimer le profil ? Toutes les infos locales seront effacées.')) return;
  state.profile = { name:'', email:'', avatar: null };
  localStorage.setItem(LS.PROFILE, JSON.stringify(state.profile));
  fillProfileUI();
  showToast('Profil effacé');
}

/* ---------- POSTS ---------- */
function loadPosts(){
  const raw = localStorage.getItem(LS.POSTS);
  state.posts = raw ? JSON.parse(raw) : [];
}
function savePosts(){
  localStorage.setItem(LS.POSTS, JSON.stringify(state.posts));
}

/* Create a post object:
   { id, text, date, image (dataURL|null), likes:number, comments: [{id,text,date}], mood }
*/
function addPost(text, image=null, mood=null){
  const p = {
    id: uid(),
    text,
    image,
    mood,
    date: new Date().toISOString(),
    likes: 0,
    comments: []
  };
  state.posts.unshift(p);
  savePosts();
  renderAll();
  showToast('Post publié');
}

function deletePost(id){
  if(!confirm('Supprimer ce post ?')) return;
  state.posts = state.posts.filter(p=>p.id!==id);
  savePosts();
  renderAll();
  showToast('Post supprimé');
}

function editPost(id, newText){
  const p = state.posts.find(pp=>pp.id===id);
  if(!p) return;
  p.text = newText;
  p.date = new Date().toISOString(); // update date to indicate edit
  savePosts();
  renderAll();
  showToast('Post modifié');
}

function toggleLike(id){
  const p = state.posts.find(pp=>pp.id===id);
  if(!p) return;
  p.likes = (p.likes || 0) + 1;
  savePosts();
  renderAll();
}

/* Comments */
function addComment(postId, text){
  const p = state.posts.find(pp=>pp.id===postId);
  if(!p) return;
  p.comments.push({ id: uid(), text, date: new Date().toISOString() });
  savePosts();
  renderAll();
  showToast('Commentaire ajouté');
}

/* ---------- UI Wiring ---------- */
function wireUI(){
  // Theme toggles (multiple on pages)
  $$('#toggleTheme').forEach(btn => btn.addEventListener('click', toggleTheme));

  // Landing features button
  const showFeatures = $('#showFeatures');
  if(showFeatures) showFeatures.addEventListener('click', ()=> {
    document.getElementById('featuresSection').scrollIntoView({behavior:'smooth'});
  });

  // Profile page specific
  const editBtn = $('#editProfileBtn');
  if(editBtn) editBtn.addEventListener('click', openProfileDialog);

  const resetBtn = $('#resetProfile');
  if(resetBtn) resetBtn.addEventListener('click', resetProfile);

  // Avatar upload
  const avatarFile = $('#avatarFile');
  if(avatarFile) avatarFile.addEventListener('change', handleAvatarUpload);

  // Composer
  const postBtn = $('#postBtn');
  if(postBtn) postBtn.addEventListener('click', handleComposerPost);

  const clearComposer = $('#clearComposer');
  if(clearComposer) clearComposer.addEventListener('click', () => {
    const t = $('#composerInput'); if(t) t.value=''; showToast('Brouillon effacé');
  });

  const composerImage = $('#composerImage');
  if(composerImage) composerImage.addEventListener('change', handleComposerImage);

  // Search & sort
  const search = $('#searchNotes');
  if(search) search.addEventListener('input', ()=> renderFeed());

  const sortSel = $('#sortNotes');
  if(sortSel) sortSel.addEventListener('change', ()=> renderFeed());

  // Avatar preview click to trigger input
  const avatarPreview = $('#avatarPreview');
  if(avatarPreview) avatarPreview.addEventListener('click', ()=> $('#avatarFile').click());

  // Profile Dialog
  const profDialog = $('#profileDialog');
  const saveProfBtn = $(
