/* ===== Theme Toggle ===== */
const toggleThemeBtn = document.getElementById('toggleTheme');
const savedTheme = localStorage.getItem('memoTheme');
if(savedTheme) document.body.classList.add(savedTheme), toggleThemeBtn.innerText = savedTheme==='dark'?'☀️':'🌙';
toggleThemeBtn?.addEventListener('click', ()=>{
  document.body.classList.toggle('dark');
  let theme = document.body.classList.contains('dark')?'dark':'';
  localStorage.setItem('memoTheme', theme);
  toggleThemeBtn.innerText = document.body.classList.contains('dark')?'☀️':'🌙';
});

/* ===== Toast Notifications ===== */
function showToast(msg){
  const toast = document.getElementById('toast');
  toast.innerText = msg;
  toast.style.opacity = '1';
  setTimeout(()=> toast.style.opacity='0',2000);
}

/* ===== Profil ===== */
const profileForm = document.getElementById('profileForm');
const message = document.getElementById('message');
const resetProfileBtn = document.getElementById('resetProfile');
if(profileForm){
  const nameInput = document.getElementById('name');
  const emailInput = document.getElementById('email');
  nameInput.value = localStorage.getItem('memoName')||'';
  emailInput.value = localStorage.getItem('memoEmail')||'';
  if(localStorage.getItem('memoName')) message.innerHTML = `<p>Bonjour ${localStorage.getItem('memoName')} !</p>`;
  profileForm.addEventListener('submit',e=>{
    e.preventDefault();
    const name=nameInput.value.trim(), email=emailInput.value.trim();
    localStorage.setItem('memoName',name); localStorage.setItem('memoEmail',email);
    message.innerHTML = `<p>Profil enregistré ! Bonjour ${name}.</p>`;
    nameInput.value=name; emailInput.value=email;
    showToast('Profil enregistré !');
  });
  resetProfileBtn?.addEventListener('click',()=>{
    if(confirm("Voulez-vous vraiment effacer votre profil ?")){
      localStorage.removeItem('memoName'); localStorage.removeItem('memoEmail');
      message.innerHTML = `<p>Profil effacé.</p>`;
      nameInput.value=''; emailInput.value='';
      showToast('Profil effacé !');
    }
  });
}

/* ===== Notes ===== */
const noteForm=document.getElementById('noteForm');
const noteInput=document.getElementById('noteInput');
const noteList=document.getElementById('noteList');
let notes=JSON.parse(localStorage.getItem('memoNotes')||"[]");

function saveNotes(){ localStorage.setItem('memoNotes',JSON.stringify(notes)); }

function renderNotes(filterText=''){
  noteList.innerHTML='';
  let filtered = notes.filter(n=>n.text.toLowerCase().includes(filterText.toLowerCase()));
  const sortMode=document.getElementById('sortNotes')?.value||'newest';
  filtered = filtered.sort((a,b)=>sortMode==='newest'?new Date(b.date)-new Date(a.date):new Date(a.date)-new Date(b.date));
  filtered.forEach((noteObj,index)=>{
    const li=document.createElement('li');
    li.setAttribute('draggable','true');
    li.innerHTML=`<span>${noteObj.text} <small>(${noteObj.date})</small></span> <button onclick="deleteNote(${index})">Supprimer</button>`;
    noteList.appendChild(li);
  });
  addDragEvents();
}

function deleteNote(index){
  const li=noteList.children[index];
  li.style.opacity=0;
  setTimeout(()=>{
    notes.splice(index,1); saveNotes(); renderNotes();
    showToast('Note supprimée !');
  },300);
}

noteForm?.addEventListener('submit',e=>{
  e.preventDefault();
  const noteText=noteInput.value.trim();
  if(noteText){
    const date=new Date().toLocaleDateString()+" "+new Date().toLocaleTimeString();
    notes.push({text:noteText,date});
    saveNotes(); noteInput.value=''; renderNotes();
    showToast('Note ajoutée !');
  }
});

document.getElementById('searchNotes')?.addEventListener('input',e=>{
  renderNotes(e.target.value);
});
document.getElementById('sortNotes')?.addEventListener('change',()=>renderNotes(document.getElementById('searchNotes').value));

/* ===== Drag & Drop Notes ===== */
function addDragEvents(){
  let dragSrcEl=null;
  const lis=document.querySelectorAll('#noteList li');
  lis.forEach(li=>{
    li.addEventListener('dragstart',(e)=>{ dragSrcEl=li; e.dataTransfer.effectAllowed='move'; });
    li.addEventListener('dragover',(e)=>{ e.preventDefault(); e.dataTransfer.dropEffect='move'; });
    li.addEventListener('drop',(e)=>{
      e.stopPropagation();
      if(dragSrcEl!==li){
        const fromIndex=[...noteList.children].indexOf(dragSrcEl);
        const toIndex=[...noteList.children].indexOf(li);
        notes.splice(toIndex,0,notes.splice(fromIndex,1)[0]);
        saveNotes(); renderNotes();
      }
    });
  });
}

/* ===== Initial render ===== */
renderNotes();
