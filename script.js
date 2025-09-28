// ==== UTILISATEURS ====
let users = JSON.parse(localStorage.getItem('memoUsers')) || [];
let currentUserId = localStorage.getItem('currentUserId') || null;

if(!currentUserId){
  // Crée un utilisateur par défaut si jamais
  const defaultUser = {id: Date.now(), name:'Moi', email:'moi@mail.com', avatar:'avatar.png', following:[], followers:[]};
  users.push(defaultUser);
  localStorage.setItem('memoUsers', JSON.stringify(users));
  currentUserId = defaultUser.id;
  localStorage.setItem('currentUserId', currentUserId);
}

function getCurrentUser(){
  return users.find(u=>u.id==currentUserId);
}

// ==== PROFIL ====
const profileForm = document.getElementById('profileForm');
const message = document.getElementById('message');
const displayName = document.getElementById('displayName');
const displayEmail = document.getElementById('displayEmail');
const followingCount = document.getElementById('followingCount');
const followersCount = document.getElementById('followersCount');
const profileAvatar = document.getElementById('profileAvatar');
const avatarInput = document.getElementById('avatarInput');
const allUsersDiv = document.getElementById('allUsers');

function showToast(text){
  const toast = document.getElementById('toast');
  toast.textContent = text;
  toast.classList.add('show');
  setTimeout(()=>{ toast.classList.remove('show'); },2000);
}

function saveUsers(){
  localStorage.setItem('memoUsers', JSON.stringify(users));
}

function renderProfile(){
  const user = getCurrentUser();
  displayName.textContent = user.name;
  displayEmail.textContent = user.email;
  followingCount.textContent = user.following.length;
  followersCount.textContent = user.followers.length;
  profileAvatar.src = user.avatar;
}

function renderAllUsers(){
  allUsersDiv.innerHTML='';
  users.forEach(u=>{
    if(u.id==currentUserId)
