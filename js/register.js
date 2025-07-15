document.addEventListener('DOMContentLoaded', function () {
    const registerForm = document.querySelector('.form');

    registerForm.addEventListener('submit', function (event) {
        event.preventDefault(); // Prevent the default form submission

        const username = document.getElementById('username').value;
        const email = document.getElementById('email').value;
        const phone = document.getElementById('phone').value;
        const password = document.getElementById('password').value;

        // Simple validation
        if (username === '' || email === '' || phone === '' || password === '') {
            alert('Please fill in all fields.');
            return;
        }

        // Basic phone number validation
        const phoneRegex = /^\d{10,}$/; // Validates for at least 10 digits
        if (!phoneRegex.test(phone)) {
            alert('Please enter a valid phone number (at least 10 digits).');
            return;
        }

        // Simulate successful registration
        alert('Registration successful! Welcome, ' + username + '!');
        window.location.href = 'index.html';
    });
});