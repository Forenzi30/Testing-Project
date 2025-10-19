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
        
        // Show History link if not present
        let historyLink = document.querySelector('a[href="history.html"]');
        if (!historyLink) {
            historyLink = document.createElement('a');
            historyLink.href = 'history.html';
            historyLink.textContent = 'History';
            historyLink.className = 'nav-btn history-link';
            orderLink.parentNode.insertBefore(historyLink, loginBtn);
        } else {
            historyLink.style.display = '';
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
        // Hide History link if present
        const historyLink = document.querySelector('a[href="history.html"]');
        if (historyLink) {
            historyLink.style.display = 'none';
        }
        // Show Login button
        loginBtn.textContent = 'Login';
        loginBtn.href = 'login.html';
        loginBtn.onclick = null;
    }

    // Show Admin Dashboard link only for admin
    let adminLink = document.querySelector('a[href="admin_dashboard.html"]');
    if (localStorage.getItem('isAdmin') === 'true') {
        if (!adminLink) {
            adminLink = document.createElement('a');
            adminLink.href = 'admin_dashboard.html';
            adminLink.textContent = 'Admin Dashboard';
            adminLink.className = 'nav-btn admin-link';
            // Insert before login/logout button
            loginBtn.parentNode.insertBefore(adminLink, loginBtn);
        } else {
            adminLink.style.display = '';
        }
    } else if (adminLink) {
        adminLink.style.display = 'none';
    }
}

updateNav();
