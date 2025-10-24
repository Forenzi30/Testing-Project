document.addEventListener('DOMContentLoaded', function () {
    const registerForm = document.querySelector('.form');

    // helper: create notification
    function createNotification(message, type = 'info', timeout = 3500) {
        const n = document.createElement('div');
        n.className = `notif ${type}`;
        n.textContent = message;
        document.body.appendChild(n);
        requestAnimationFrame(() => n.classList.add('visible'));
        setTimeout(() => {
            n.classList.remove('visible');
            setTimeout(()=> n.remove(), 300);
        }, timeout);
    }

    // helper: animate form
    function animateForm(effect) {
        if (!registerForm) return;
        registerForm.classList.add(effect);
        registerForm.addEventListener('animationend', () => registerForm.classList.remove(effect), { once: true });
    }

    registerForm.addEventListener('submit', function (event) {
        event.preventDefault(); // Prevent the default form submission

        const username = document.getElementById('username').value;
        const email = document.getElementById('email').value;
        const phone = document.getElementById('phone_number').value;
        const password = document.getElementById('password').value;

        // Simple client-side validation
        if (username === '' || email === '' || phone === '' || password === '') {
            createNotification('Please fill in all fields.', 'error');
            animateForm('shake');
            return;
        }

        // Basic phone number validation (at least 10 digits)
        const phoneRegex = /^\d{10,}$/;
        if (!phoneRegex.test(phone)) {
            createNotification('Please enter a valid phone number (at least 10 digits).', 'error');
            animateForm('shake');
            return;
        }

        // Prepare the data to send to the backend
        const userData = {
            username,
            email,
            phone_number: phone,
            password,
        };

        const backendUrl = window.env && window.env.BACKEND_URL ? window.env.BACKEND_URL : 'http://localhost:3030';

        fetch(backendUrl + '/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData),
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Registration successful: show animation + notification
                createNotification('Registration successful! Redirecting...', 'success', 2000);
                animateForm('pulse');
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 900);
            } else {
                createNotification('Registration failed: ' + (data.message || 'Unknown'), 'error', 4000);
                animateForm('shake');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            createNotification('An error occurred while registering. Please try again.', 'error');
            animateForm('shake');
        });
    });
});
