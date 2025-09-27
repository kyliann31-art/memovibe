// Exemple simple pour sauvegarder le profil localement
const form = document.getElementById('profileForm');
const message = document.getElementById('message');

if(form) {
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;

        localStorage.setItem('memoName', name);
        localStorage.setItem('memoEmail', email);

        message.innerHTML = `<p>Profil enregistré ! Bonjour ${name}.</p>`;
        form.reset();
    });
}
