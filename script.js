// PROFIL UTILISATEUR
const profileForm = document.getElementById('profileForm');
const message = document.getElementById('message');

if(profileForm){
  profileForm.addEventListener('submit', function(e){
    e.preventDefault();
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;

    localStorage.setItem('memoName', name);
    localStorage.setItem('memoEmail', email);

    message.innerHTML = `<p>Profil enregistré ! Bonjour ${name}.</p>`;
    profileForm.reset();
  });

  // Charger les infos si déjà sauvegardées
  document.getElementById('name').value = localStorage.getItem('memoName') || '';
  document.getElementById('email').value = localStorage.getItem('memoEmail') || '';
}

// NOTES / DECISIONS
const noteForm = document.getElementById('noteForm');
const noteInput = document.getElementById('noteInput');
const noteList = document.getElementById('noteList');

let notes = JSON.parse(localStorage.getItem('memoNotes') || "[]");

function renderNotes(){
  noteList.innerHTML = '';
  notes.forEach((note, index)=>{
    const li = document.createElement('li');
    li.innerHTML = `${note} <button onclick="deleteNote(${index})">Supprimer</button>`;
    noteList.appendChild(li);
  });
}

function deleteNote(index){
  notes.splice(index,1);
  localStorage.setItem('memoNotes', JSON.stringify(notes));
  renderNotes();
}

if(noteForm){
  noteForm.addEventListener('submit', function(e){
    e.preventDefault();
    const note = noteInput.value.trim();
    if(note){
      notes.push(note);
      localStorage.setItem('memoNotes', JSON.stringify(notes));
      noteInput.value = '';
      renderNotes();
    }
  });
}

// Initial render
renderNotes();
