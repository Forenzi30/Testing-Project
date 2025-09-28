// Update tampilan tombol login/logout di navbar dan tampilkan link profile jika login
function updateNav() {
    const loginBtn = document.querySelector('a[href="login.html"]');
    const navLinks = document.querySelector('.nav-links');
    let profileLink = document.querySelector('a[href="profile.html"]');

    if (!loginBtn || !navLinks) return;

    if (localStorage.getItem('isLoggedIn') === 'true') {
        // Show Profile link if not present
        if (!profileLink) {
            profileLink = document.createElement('a');
            profileLink.href = 'profile.html';
            profileLink.textContent = 'Profile';
            profileLink.className = 'nav-btn profile-link';
            // Insert before login/logout button if possible
            loginBtn.parentNode.insertBefore(profileLink, loginBtn);
        } else {
            profileLink.style.display = '';
        }

        loginBtn.textContent = 'Logout';
        loginBtn.href = '#';
        loginBtn.onclick = function (e) {
            e.preventDefault();
            localStorage.setItem('isLoggedIn', 'false');
            localStorage.removeItem('username');
            updateNav();
            location.reload(); // Force refresh after logout
        };
    } else {
        // Hide Profile link if present
        if (profileLink) {
            profileLink.style.display = 'none';
        }
        loginBtn.textContent = 'Login';
        loginBtn.href = 'login.html';
        loginBtn.onclick = null;
    }
}

updateNav();
