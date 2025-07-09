// Simple login state management
function updateNav() {
    const loginBtn = document.querySelector('a[href="login.html"]');
    if (!loginBtn) return;
    if (localStorage.getItem('isLoggedIn') === 'true') {
        loginBtn.textContent = 'Logout';
        loginBtn.href = '#';
        loginBtn.onclick = function(e) {
            e.preventDefault();
            localStorage.setItem('isLoggedIn', 'false');
            updateNav();
        };
    } else {
        loginBtn.textContent = 'Login';
        loginBtn.href = 'login.html';
        loginBtn.onclick = null;
    }
}

// Simulate login after visiting login.html (for demo)
if (window.location.pathname.endsWith('login.html')) {
    localStorage.setItem('isLoggedIn', 'true');
    window.location.href = 'index.html';
}

updateNav();