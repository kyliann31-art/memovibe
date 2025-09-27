/* =================================
   Theme Toggle
================================= */
const toggleThemeBtn = document.getElementById('toggleTheme');
toggleThemeBtn?.addEventListener('click', ()=>{
  document.body.classList.toggle('dark');
  toggleThemeBtn.innerText = document.body.classList.contains('dark') ? '☀️' : '🌙';
});

/* =================================
   Profil Utilisateur
================================= */
const profileForm = document.getElementById('profileForm');
const message = document.getElementById('message');
const resetProfileBtn = document.getElementById('resetProfile');

if(profileForm){
  const nameInput = document.getElementById('name');
  const emailInput = document.getElementById('email');

  // Charger infos sauvegardées
  nameInput.value = localStorage.getItem('memoName') || '';
  emailInput.value = localStorage.getItem('memoEmail') || '';

  if(localStorage.getItem('memoName')){
    message.innerHTML = `<p>Bonjour ${localStorage.getItem('memoName')} !</p>`;
  }

  profileForm.addEventListener('submit', function(e){
    e.preventDefault();
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();

    localStorage.setItem('memoName', name);
    localStorage.setItem('memoEmail', email);

    message.innerHTML = `<p>Profil enregistré ! Bonjour ${name}.</p>`;
    profileForm.reset();
    nameInput.value = name;
    emailInput.value = email;
  });

  resetProfileBtn?.addEventListener('click', ()=>{
    if(confirm("Voulez-vous vraiment effacer votre profil ?")){
      localStorage.removeItem('memoName');
      localStorage.removeItem('memoEmail');
      message.innerHTML = `<p>Profil effacé.</p>`;
      nameInput.value = '';
      emailInput.value = '';
    }
  });
}

/* =================================
   Notes / Décisions
================================= */
const noteForm = document.getElementById('noteForm');
const noteInput = document.getElementById('noteInput');
const noteList = document.getElementById('noteList');

let notes = JSON.parse(localStorage.getItem('memoNotes') || "[]");

function renderNotes(){
  noteList.innerHTML = '';
  notes.forEach((noteObj, index)=>{
    const li = document.createElement('li');
    li.innerHTML = `<span>${noteObj.text} <small>(${noteObj.date})</small></span> <button onclick="deleteNote(${index})">Supprimer</button>`;
    noteList.appendChild(li);
  });
}

function deleteNote(index){
  const li = noteList.children[index];
  li.style.opacity = 0;
  setTimeout(()=>{
    notes.splice(index,1);
    localStorage.setItem('memoNotes', JSON.stringify(notes));
    renderNotes();
  }, 300);
}

if(noteForm){
  noteForm.addEventListener('submit', function(e){
    e.preventDefault();
    const noteText = noteInput.value.trim();
    if(noteText){
      const date = new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString();
      notes.push({text: noteText, date});
      localStorage.setItem('memoNotes', JSON.stringify(notes));
      noteInput.value = '';
      renderNotes();
    }
  });
}

// Initial render
renderNotes();
