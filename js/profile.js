document.addEventListener('DOMContentLoaded', function () {
    let oldUsername = localStorage.getItem('username');
    if (!oldUsername) {
        window.location.href = 'login.html';
        return;
    }

    const form = document.getElementById('profile-form');
    const msgDiv = document.getElementById('profile-message');
    const editBtn = document.getElementById('edit-profile-btn');
    const saveBtn = document.getElementById('save-profile-btn');
    const cancelBtn = document.getElementById('cancel-edit-btn');
    const passwordSection = document.getElementById('password-section');

    // Header elements
    const nameHeader = document.getElementById('profile-name-header');
    const usernameHeader = document.getElementById('profile-username-header');
    const profilePicture = document.getElementById('profile-picture');
    const profileInitials = document.getElementById('profile-initials');

    // Store original values for cancel
    let originalData = {};

    function fetchAndFillProfile(usernameToFetch) {
        fetch(`/api/profile?username=${encodeURIComponent(usernameToFetch)}`)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setProfileFields(data.user);
                    setProfileHeader(data.user);
                    originalData = { ...data.user };
                } else {
                    msgDiv.textContent = data.message || 'Failed to load profile.';
                    msgDiv.style.color = 'red';
                }
            })
            .catch(() => {
                msgDiv.textContent = 'Error loading profile.';
                msgDiv.style.color = 'red';
            });
    }

    function setProfileFields(user) {
        document.getElementById('profile-username').value = user.username || '';
        document.getElementById('profile-name').value = user.name || '';
        document.getElementById('profile-email').value = user.email || '';
        document.getElementById('profile-phone').value = user.phone_number || '';
        document.getElementById('profile-address').value = user.address || '';
    }

    function setProfileHeader(user) {
        nameHeader.textContent = user.name || '';
        usernameHeader.textContent = user.username ? '@' + user.username : '';
        // Set initials
        let initials = '?';
        if (user.name) {
            const parts = user.name.trim().split(' ');
            initials = parts.length > 1
                ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
                : user.name.substring(0, 2).toUpperCase();
        }
        profileInitials.textContent = initials;
    }

    function setEditable(editable) {
        ['profile-username', 'profile-name', 'profile-email', 'profile-phone', 'profile-address'].forEach(id => {
            const input = document.getElementById(id);
            input.readOnly = !editable;
            if (editable) {
                input.classList.add('editable');
            } else {
                input.classList.remove('editable');
            }
        });
        passwordSection.style.display = editable ? '' : 'none';
        editBtn.style.display = editable ? 'none' : '';
        saveBtn.style.display = editable ? '' : 'none';
        cancelBtn.style.display = editable ? '' : 'none';
    }

    editBtn.addEventListener('click', function () {
        setEditable(true);
        msgDiv.textContent = '';
    });

    cancelBtn.addEventListener('click', function () {
        setProfileFields(originalData);
        setEditable(false);
        document.getElementById('profile-password').value = '';
        msgDiv.textContent = '';
    });

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        msgDiv.textContent = '';
        const newUsername = document.getElementById('profile-username').value;
        const payload = {
            oldUsername: oldUsername,
            username: newUsername,
            name: document.getElementById('profile-name').value,
            email: document.getElementById('profile-email').value,
            phone_number: document.getElementById('profile-phone').value,
            address: document.getElementById('profile-address').value,
            password: document.getElementById('profile-password').value
        };
        fetch('/api/profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(res => res.json())
        .then(data => {
            msgDiv.textContent = data.message;
            msgDiv.style.color = data.success ? 'green' : 'red';
            if (data.success) {
                document.getElementById('profile-password').value = '';
                setEditable(false);
                // If username changed, update localStorage and oldUsername, and refetch
                if (newUsername !== oldUsername) {
                    localStorage.setItem('username', newUsername);
                    oldUsername = newUsername;
                }
                // Refetch to ensure data is up to date
                fetchAndFillProfile(oldUsername);
            }
        })
        .catch(() => {
            msgDiv.textContent = 'Error updating profile.';
            msgDiv.style.color = 'red';
        });
    });

    // Start in view mode and fetch data
    setEditable(false);
    fetchAndFillProfile(oldUsername);
});
