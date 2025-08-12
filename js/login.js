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
            // Kirim data ke server
            const response = await fetch('https://testing-project-production-990b.up.railway.app/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (data.success) {
                // Simpan status login di localStorage
                localStorage.setItem('isLoggedIn', 'true');
                localStorage.setItem('username', username);

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
