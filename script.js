/* ===============================
   MemoVibe - script.js version finale
   =============================== */

// -------------------------------
// Helpers : LocalStorage
// -------------------------------
function saveData(key, data) { localStorage.setItem(key, JSON.stringify(data)); }
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
    photo: "default-avatar.png"
});

let posts = loadData("memoPosts", []); // {id, author, authorId, content, category, likes, comments, reactions, date}
let users = loadData("memoUsers", [currentUser]); // liste de tous les profils
let follows = loadData("memoFollows", {}); // { userId: [listIds] }
let userPoints = loadData("memoPoints", {[currentUser.email]:0});
let challenges = loadData("memoChallenges", []); // {id, title, description, completedBy: []}
let notifications = loadData("memoNotifications", []); // {text, date, read}

// -------------------------------
// Toast
// -------------------------------
function showToast(text) {
    let toast = document.getElementById("toast") || document.getElementById("toastProfile");
    if(!toast) return;
    toast.textContent = text;
    toast.classList.add("show");
    setTimeout(()=>{ toast.classList.remove("show"); }, 3000);
}

// -------------------------------
// Profil
// -------------------------------
function updateProfile(name, email, bio, photo) {
    currentUser.name = name;
    currentUser.email = email;
    currentUser.bio = bio;
    if(photo) currentUser.photo = photo;

    let idx = users.findIndex(u => u.email === currentUser.email);
    if(idx !== -1) users[idx] = currentUser;
    else users.push(currentUser);

    saveData("memoUser", currentUser);
    saveData("memoUsers", users);
    showToast("Profil mis à jour !");
    loadProfilePage();
}

// -------------------------------
// Load Profile Page
// -------------------------------
function loadProfilePage(){
    let nameEl = document.getElementById("profileName");
    let bioEl = document.getElementById("profileBio");
    let photoEl = document.getElementById("profileAvatar");
    let postList = document.getElementById("userPosts");
    let countFollowers = document.getElementById("profileFollowers");
    let countFollowing = document.getElementById("profileFollowing");
    let countPosts = document.getElementById("profilePosts");

    if(nameEl) nameEl.textContent = currentUser.name;
    if(bioEl) bioEl.textContent = currentUser.bio;
    if(photoEl && currentUser.photo) photoEl.src = currentUser.photo;

    let followers = Object.entries(follows).filter(([uid, list]) => list.includes(currentUser.email)).length;
    let following = follows[currentUser.email]?.length || 0;
    let userPosts = posts.filter(p => p.authorId === currentUser.email).length;

    if(countFollowers) countFollowers.textContent = followers;
    if(countFollowing) countFollowing.textContent = following;
    if(countPosts) countPosts.textContent = userPosts;

    if(postList){
        postList.innerHTML="";
        posts.filter(p => p.authorId === currentUser.email)
             .forEach(p => postList.appendChild(renderPost(p)));
    }
}

// -------------------------------
// Posts
// -------------------------------
function addPost(content, category){
    let newPost = {
        id: Date.now(),
        author: currentUser.name,
        authorId: currentUser.email,
        content,
        category,
        likes:0,
        comments:[],
        reactions:[],
        date: new Date().toISOString()
    };
    posts.unshift(newPost);
    saveData("memoPosts", posts);
    showToast("Expérience publiée !");
    renderFeed(currentFeedFilter || "friends");
}

// Like / Comment / React
function likePost(postId){
    let post = posts.find(p=>p.id===postId);
    if(post){ post.likes++; saveData("memoPosts", posts); renderFeed(currentFeedFilter || "friends"); addNotification(`${currentUser.name} a liké un post !`);}
}
function commentPost(postId,text){
    let post = posts.find(p=>p.id===postId);
    if(post){ post.comments.push({author:currentUser.name,text}); saveData("memoPosts", posts); renderFeed(currentFeedFilter || "friends"); addNotification(`${currentUser.name} a commenté un post !`);}
}
function reactPost(postId,emoji){
    let post = posts.find(p=>p.id===postId);
    if(post){ post.reactions.push({author:currentUser.name,emoji}); saveData("memoPosts", posts); renderFeed(currentFeedFilter || "friends"); addNotification(`${currentUser.name} a réagi avec ${emoji} !`);}
}

// -------------------------------
// Render Post
// -------------------------------
function renderPost(post){
    let li = document.createElement("div");
    li.className = "post-card";
    li.dataset.id = post.id;

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
            ${post.reactions.map(r=>`<span>${r.emoji}</span>`).join(" ")}
        </div>
    `;

    li.querySelector(".btn-like").addEventListener("click",()=>likePost(post.id));
    li.querySelector(".btn-comment").addEventListener("click",()=>{
        let text = prompt("Votre commentaire :");
        if(text) commentPost(post.id,text);
    });
    li.querySelector(".btn-react").addEventListener("click",()=>{
        let emoji = prompt("Entrez un emoji :");
        if(emoji) reactPostAnimated(post.id,emoji);
    });

    return li;
}

// -------------------------------
// Feed
// -------------------------------
let currentFeedFilter = "friends";
function renderFeed(filter="friends"){
    currentFeedFilter = filter;
    let feed = document.getElementById("feed");
    if(!feed) return;
    feed.innerHTML="";

    let visiblePosts=[];
    if(filter==="friends"){
        let following = follows[currentUser.email] || [];
        visiblePosts = posts.filter(p=>following.includes(p.authorId));
    } else if(filter==="mine"){
        visiblePosts = posts.filter(p=>p.authorId===currentUser.email);
    } else {
        visiblePosts = posts;
    }

    if(visiblePosts.length===0){ feed.innerHTML="<p>Aucune expérience pour le moment.</p>"; return;}

    visiblePosts.forEach(p=>feed.appendChild(renderPost(p)));
    renderChallenges();
}

// -------------------------------
// Follow / Unfollow
// -------------------------------
function followUser(email){ if(!follows[currentUser.email])follows[currentUser.email]=[]; if(!follows[currentUser.email].includes(email)){follows[currentUser.email].push(email); saveData("memoFollows",follows); addNotification(`Vous suivez ${email}`);}}
function unfollowUser(email){ if(!follows[currentUser.email])return; follows[currentUser.email]=follows[currentUser.email].filter(e=>e!==email); saveData("memoFollows",follows); addNotification(`Vous ne suivez plus ${email}`);}

// -------------------------------
// Search
// -------------------------------
function search(type, query, category=null){
    if(type==="profile") return users.filter(u=>u.name.toLowerCase().includes(query.toLowerCase()));
    if(type==="experience") return posts.filter(p=>{
        let matchText = p.content.toLowerCase().includes(query.toLowerCase());
        let matchCat = category ? p.category===category : true;
        return matchText && matchCat;
    });
    return [];
}

// -------------------------------
// Hamburger Menu
// -------------------------------
function setupMenu(){
    let btns = [document.getElementById("hamburger"), document.getElementById("hamburger2")];
    let menu = document.getElementById("sideMenu");
    btns.forEach(btn=>{
        if(btn && menu) btn.addEventListener("click",()=>menu.classList.toggle("show"));
    });

    let closeMenu = document.getElementById("closeMenu");
    if(closeMenu) closeMenu.addEventListener("click",()=>menu.classList.remove("show"));

    // Menu actions
    let createBtn = document.getElementById("menuCreateAccount");
    if(createBtn) createBtn.addEventListener("click",()=>showOverlayCreateProfile());
    let resetBtn = document.getElementById("menuReset");
    if(resetBtn) resetBtn.addEventListener("click",()=>{ localStorage.clear(); location.reload(); });
}

// -------------------------------
// Overlay Create Profile
// -------------------------------
function showOverlayCreateProfile(){
    let overlay = document.getElementById("createProfileOverlay");
    if(overlay) overlay.classList.remove("hidden");
}

// -------------------------------
// Emoji Animé
// -------------------------------
function reactPostAnimated(postId,emoji){
    reactPost(postId,emoji);
    let postEl = document.querySelector(`.post-card[data-id='${postId}']`);
    if(postEl){
        let span = document.createElement("span");
        span.textContent=emoji;
        span.style.position="absolute";
        span.style.fontSize="24px";
        span.style.top="0px";
        span.style.left="50%";
        span.style.transform="translateX(-50%)";
        span.style.opacity=1;
        postEl.appendChild(span);
        let anim = setInterval(()=>{
            let top=parseInt(span.style.top);
            span.style.top=(top-2)+"px";
            span.style.opacity-=0.03;
            if(span.style.opacity<=0){ clearInterval(anim); span.remove(); }
        },16);
    }
}

// -------------------------------
// Challenges
// -------------------------------
function addChallenge(title,description){
    let newChallenge={id:Date.now(),title,description,completedBy:[]};
    challenges.push(newChallenge);
    saveData("memoChallenges",challenges);
    renderChallenges();
}
function completeChallenge(challengeId){
    let challenge=challenges.find(c=>c.id===challengeId);
    if(!challenge) return;
    if(!challenge.completedBy.includes(currentUser.email)){
        challenge.completedBy.push(currentUser.email);
        userPoints[currentUser.email]=(userPoints[currentUser.email]||0)+10;
        saveData("memoChallenges",challenges);
        saveData("memoPoints",userPoints);
        showToast("Défi complété ! +10 points 🎉");
        addNotification(`Vous avez complété le défi "${challenge.title}" !`);
        renderChallenges();
    }
}
function renderChallenges(){
    let feed = document.getElementById("feed");
    if(!feed) return;
    let container = document.createElement("div");
    container.className="challenge-list card";
    container.innerHTML="<h4>Défis</h4>";
    challenges.forEach(c=>{
        let btnText = c.completedBy.includes(currentUser.email)?"✅ Complété":"Relever";
        let btn = `<button class="btn-challenge" onclick="completeChallenge(${c.id})">${btnText}</button>`;
        container.innerHTML+=`<div class="challenge-item"><strong>${c.title}</strong><p>${c.description}</p>${btn}</div>`;
    });
    feed.prepend(container);
}

// -------------------------------
// Notifications
// -------------------------------
function addNotification(text){
    notifications.unshift({text,date:new Date().toISOString(),read:false});
    saveData("memoNotifications",notifications);
    renderNotifications();
}
function renderNotifications(){
    let notifContainer=document.getElementById("notifications");
    if(!notifContainer) return;
    notifContainer.innerHTML="";
    notifications.forEach(n=>{
        let div=document.createElement("div");
        div.className="notification-item"+(n.read?" read":"");
        div.textContent=`${n.text} - ${new Date(n.date).toLocaleTimeString()}`;
        notifContainer.appendChild(div);
    });
}

// -------------------------------
// Initialisation
// -------------------------------
document.addEventListener("DOMContentLoaded",()=>{
    setupMenu();
    renderFeed("friends");
    loadProfilePage();

    // Composer
    let postForm=document.getElementById("postForm");
    if(postForm){
        postForm.addEventListener("submit",e=>{
            e.preventDefault();
            let content=document.getElementById("postContent").value;
            let category=document.getElementById("postCategory").value;
            if(content && category){ addPost(content,category); postForm.reset(); }
        });
    }

    // Feed buttons
    let btnFriends=document.getElementById("feedFriends");
    let btnGeneral=document.getElementById("feedGeneral");
    let btnMine=document.getElementById("feedMine");
    if(btnFriends) btnFriends.addEventListener("click",()=>renderFeed("friends"));
    if(btnGeneral) btnGeneral.addEventListener("click",()=>renderFeed("all"));
    if(btnMine) btnMine.addEventListener("click",()=>renderFeed("mine"));
});
