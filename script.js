// ==== PROFIL ====
const profileForm = document.getElementById('profileForm');
const message = document.getElementById('message');
const displayName = document.getElementById('displayName');
const displayEmail = document.getElementById('displayEmail');
const postCount = document.getElementById('postCount');

function showToast(text){
  const toast = document.getElementById('toast');
  toast.textContent = text;
  toast.classList.add('show');
  setTimeout(()=>{ toast.classList.remove('show'); },2000);
}

if(profileForm){
  profileForm.addEventListener('submit', function(e){
    e.preventDefault();
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;

    localStorage.setItem('memoName', name);
    localStorage.setItem('memoEmail', email);

    message.innerHTML = `<p>Profil enregistré ! Bonjour ${name}.</p>`;
    profileForm.reset();
    loadProfile();
    showToast("Profil enregistré ✅");
  });

  function loadProfile(){
    const name = localStorage.getItem('memoName') || '';
    const email = localStorage.getItem('memoEmail') || '';
    displayName.textContent = name;
    displayEmail.textContent = email;
    document.getElementById('name').value = name;
    document.getElementById('email').value = email;
    postCount.textContent = JSON.parse(localStorage.getItem('memoPosts')||"[]").length;
  }

  loadProfile();
}

// ==== POSTS / FEED ====
const postForm = document.getElementById('postForm');
const postInput = document.getElementById('postInput');
const feed = document.getElementById('feed');

let posts = JSON.parse(localStorage.getItem('memoPosts') || "[]");

function renderFeed(){
  if(!feed) return;
  feed.innerHTML = '';
  posts.forEach((post, index)=>{
    const div = document.createElement('div');
    div.className = 'post-card';
    let commentsHTML = '';
    if(post.comments) post.comments.forEach(c=>{
      commentsHTML += `<div class="comment"><b>${c.user}:</b> ${c.text}</
