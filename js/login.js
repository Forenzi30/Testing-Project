document.addEventListener('DOMContentLoaded', function () {
    const loginForm = document.querySelector('.form');

    loginForm.addEventListener('submit', function (event) {
        event.preventDefault(); // Prevent the default form submission

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        // Simple validation
        if (username === '' || password === '') {
            alert('Please fill in all fields.');
            return;
        }

        // Simulate successful login (you can replace this with actual authentication logic)
        alert('Login successful! Welcome, ' + username + '!');
        window.location.href = 'index.html'; // Redirect to a dashboard or another page
    });
});