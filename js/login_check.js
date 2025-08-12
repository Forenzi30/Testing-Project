// Update tampilan tombol login/logout di navbar
function updateNav() {
    const loginBtn = document.querySelector('a[href="login.html"]');
    if (!loginBtn) return;

    if (localStorage.getItem('isLoggedIn') === 'true') {
        loginBtn.textContent = 'Logout';
        loginBtn.href = '#';
        loginBtn.onclick = function (e) {
            e.preventDefault();
            localStorage.setItem('isLoggedIn', 'false');
            localStorage.removeItem('username');
            updateNav();
        };
    } else {
        loginBtn.textContent = 'Login';
        loginBtn.href = 'login.html';
        loginBtn.onclick = null;
    }
}

updateNav();
