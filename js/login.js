document.addEventListener('DOMContentLoaded', function () {
    const loginForm = document.querySelector('.form');

    // helper: create notification
    function createNotification(message, type = 'info', timeout = 3500) {
        const n = document.createElement('div');
        n.className = `notif ${type}`;
        n.textContent = message;
        document.body.appendChild(n);
        // show
        requestAnimationFrame(() => n.classList.add('visible'));
        // auto remove
        setTimeout(() => {
            n.classList.remove('visible');
            setTimeout(()=> n.remove(), 300);
        }, timeout);
    }

    // helper: animate form (shake / pulse)
    function animateForm(effect) {
        if (!loginForm) return;
        loginForm.classList.add(effect);
        loginForm.addEventListener('animationend', () => loginForm.classList.remove(effect), { once: true });
    }

    loginForm.addEventListener('submit', async function (event) {
        event.preventDefault(); // Stop form submit default

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        // Validasi sederhana
        if (username === '' || password === '') {
            createNotification('Please fill in all fields.', 'error');
            animateForm('shake');
            return;
        }

        try {
            // Get backend URL from .env via window.env (use env.js loader)
            const backendUrl = window.env && window.env.BACKEND_URL ? window.env.BACKEND_URL : 'http://localhost:3030';
            // Kirim data ke server
            const response = await fetch(backendUrl + '/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();
            console.log('Login response:', data);

            if (data.success) {
                // show success animation & notification
                createNotification('Login successful. Redirecting...', 'success', 1800);
                animateForm('pulse');

                // Simpan status login di localStorage after small delay to allow animation
                setTimeout(() => {
                    localStorage.setItem('isLoggedIn', 'true');
                    localStorage.setItem('username', username);
                    if (data.is_admin) {
                        localStorage.setItem('isAdmin', 'true');
                    } else {
                        localStorage.removeItem('isAdmin');
                    }
                    window.location.href = 'index.html'; // Pindah ke halaman utama
                }, 900);
            } else {
                // error handling: username not found vs wrong password
                createNotification(data.message || 'Login failed', 'error', 3500);
                // animate appropriate field / form
                const msg = (data.message || '').toLowerCase();
                if (msg.includes('username')) {
                    // focus username and shake
                    document.getElementById('username')?.focus();
                    animateForm('shake');
                } else if (msg.includes('password')) {
                    document.getElementById('password')?.focus();
                    animateForm('shake');
                } else {
                    animateForm('shake');
                }
            }
        } catch (err) {
            console.error(err);
            createNotification('An error occurred while login.', 'error');
            animateForm('shake');
        }
    });
});
