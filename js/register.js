document.addEventListener('DOMContentLoaded', function () {
    const registerForm = document.querySelector('.form');

    registerForm.addEventListener('submit', function (event) {
        event.preventDefault(); // Prevent the default form submission

        const username = document.getElementById('username').value;
        const email = document.getElementById('email').value;
        const phone = document.getElementById('phone_number').value;
        const password = document.getElementById('password').value;

        // Simple client-side validation
        if (username === '' || email === '' || phone === '' || password === '') {
            alert('Please fill in all fields.');
            return;
        }

        // Basic phone number validation (at least 10 digits)
        const phoneRegex = /^\d{10,}$/;
        if (!phoneRegex.test(phone)) {
            alert('Please enter a valid phone number (at least 10 digits).');
            return;
        }

        // Prepare the data to send to the backend
        const userData = {
            username,
            email,
            phone_number: phone,
            password,
        };

        // Set your Railway backend API base URL here (without /api/register)
        const backendUrl = 'mainline.proxy.rlwy.net:13550';

        // Send the data to the backend via POST request using fetch
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
                // Registration successful
                alert('Registration successful! Welcome, ' + username + '!');
                window.location.href = 'index.html';  // Redirect to the index page
            } else {
                // Registration failed, show the message from the server
                alert('Registration failed: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('An error occurred while registering. Please try again.');
        });
    });
});
