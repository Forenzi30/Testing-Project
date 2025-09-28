// Update tampilan tombol login/logout di navbar
function updateNav() {
    const loginBtn = document.querySelector('a[href="login.html"]');
    const navLinks = document.querySelector('.nav-links');
    let orderLink = document.querySelector('a[href="order.html"]');

    if (!loginBtn || !navLinks) return;

    if (localStorage.getItem('isLoggedIn') === 'true') {
        // Show Order link if not present
        if (!orderLink) {
            orderLink = document.createElement('a');
            orderLink.href = 'order.html';
            orderLink.textContent = 'Order';
            orderLink.className = 'nav-btn order-link';
            loginBtn.parentNode.insertBefore(orderLink, loginBtn);
        } else {
            orderLink.style.display = '';
        }

        // Show Logout button
        loginBtn.textContent = 'Logout';
        loginBtn.href = '#';
        loginBtn.onclick = function (e) {
            e.preventDefault();
            localStorage.setItem('isLoggedIn', 'false');
            localStorage.removeItem('username');
            updateNav();
            // If on order.html, redirect to index.html after logout
            if (window.location.pathname.endsWith('order.html')) {
                window.location.href = 'index.html';
            } else {
                location.reload(); // Force refresh after logout
            }
        };
    } else {
        // Hide Order link if present
        if (orderLink) {
            orderLink.style.display = 'none';
        }
        // Show Login button
        loginBtn.textContent = 'Login';
        loginBtn.href = 'login.html';
        loginBtn.onclick = null;
    }
}

updateNav();
        if (profileLink) {
            profileLink.style.display = 'none';
        }
        // Hide Order link if present
        if (orderLink) {
            orderLink.style.display = 'none';
        }
        loginBtn.textContent = 'Login';
        loginBtn.href = 'login.html';
        loginBtn.onclick = null;



updateNav();
