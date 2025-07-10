const menuBtn = document.getElementById('menuBtn');
const navbar = document.getElementById('navbar');

menuBtn.addEventListener('click', function() {
    navbar.classList.toggle('show');
});

// Optional: Hide navbar when clicking outside (mobile)
document.addEventListener('click', function(e) {
    if (window.innerWidth <= 767) {
        if (!navbar.contains(e.target) && e.target !== menuBtn) {
            navbar.classList.remove('show');
        }
    }
});