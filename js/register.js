document.addEventListener('DOMContentLoaded', function () {
    const registerForm = document.querySelector('.form');

    registerForm.addEventListener('submit', function (event) {
        event.preventDefault(); // Prevent the default form submission

        const username = document.getElementById('username').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        // Simple validation
        if (username === '' || email === '' || password === '') {
            alert('Please fill in all fields.');
            return;
        }

        // Simulate successful registration (you can replace this with actual registration logic)
        alert('Registration successful! Welcome, ' + username + '!');
        window.location.href = 'welcome.html'; // Redirect to a welcome page or another page
    });
});