document.addEventListener('DOMContentLoaded', function () {
    const loginForm = document.querySelector('.form');

    loginForm.addEventListener('submit', async function (event) {
        event.preventDefault(); // Stop form submit default

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        // Validasi sederhana
        if (username === '' || password === '') {
            alert('Please fill in all fields.');
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
                // Simpan status login di localStorage
                localStorage.setItem('isLoggedIn', 'true');
                localStorage.setItem('username', username);
                // Store admin flag
                if (data.is_admin) {
                    localStorage.setItem('isAdmin', 'true');
                } else {
                    localStorage.removeItem('isAdmin');
                }
                alert(data.message);
                window.location.href = 'index.html'; // Pindah ke halaman utama
            } else {
                alert(data.message);
            }
        } catch (err) {
            console.error(err);
            alert('Terjadi kesalahan saat login.');
        }
    });
});
