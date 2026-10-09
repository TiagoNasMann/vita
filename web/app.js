'use strict';
document.querySelectorAll('[data-dialog]').forEach(b => b.addEventListener('click', () => document.getElementById(b.dataset.dialog)?.showModal()));
document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => b.closest('dialog').close()));
document.querySelectorAll('dialog').forEach(d => d.addEventListener('click', e => { if (e.target === d) {
    const r = d.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)
        d.close();
} }));
const login = document.getElementById('login-form');
if (login) {
    const password = document.getElementById('password');
    document.getElementById('toggle-password').addEventListener('click', e => { const show = password.type === 'password'; password.type = show ? 'text' : 'password'; e.target.textContent = show ? 'Ocultar' : 'Mostrar'; e.target.setAttribute('aria-pressed', String(show)); });
    login.addEventListener('submit', async (e) => { e.preventDefault(); const button = login.querySelector('button[type=submit]'); const error = document.getElementById('login-error'); error.textContent = ''; button.disabled = true; button.textContent = 'Entrando…'; try {
        const response = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: login.email.value, password: login.password.value }) });
        const result = await response.json();
        if (!response.ok)
            throw new Error(result.error || 'Não foi possível entrar.');
        location.assign('/painel.html');
    }
    catch (e) {
        error.textContent = e.message;
        button.disabled = false;
        button.textContent = 'Entrar na Vita ↗';
    } });
}
