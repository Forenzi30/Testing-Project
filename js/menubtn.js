(function () {
	// find button (support id="menuBtn" or class="menu-btn")
	const btn = document.getElementById('menuBtn') || document.querySelector('.menu-btn');
	const navbar = document.getElementById('navbar') || document.querySelector('.navbar');

	if (!btn || !navbar) return;

	// helper to open/close menu (authoritative: sync .show + .nav-open + inline styles)
	function setOpen(open) {
		if (open) {
			navbar.classList.add('show');
			document.documentElement.classList.add('nav-open'); // top-level class used by CSS
			btn.setAttribute('aria-expanded', 'true');
			navbar.setAttribute('aria-hidden', 'false');
			// inline fallback to ensure visibility if page CSS hides navbar
			navbar.style.display = 'flex';
			// prevent body scroll when mobile menu open
			document.documentElement.style.overflow = 'hidden';
		} else {
			// remove both indicators and reset inline styles to avoid stuck state
			navbar.classList.remove('show');
			document.documentElement.classList.remove('nav-open');
			btn.setAttribute('aria-expanded', 'false');
			navbar.setAttribute('aria-hidden', 'true');
			navbar.style.display = '';
			document.documentElement.style.overflow = '';
		}
	}

	// toggle on click — prevent other handlers from running on same element
	btn.addEventListener('click', function (e) {
		// Prevent other click listeners on the same element (fixes double-toggle/stuck state)
		e.stopImmediatePropagation();
		e.preventDefault();

		const isOpen = navbar.classList.contains('show') || document.documentElement.classList.contains('nav-open');
		setOpen(!isOpen);
	});

	// close when clicking outside the navbar on small screens
	document.addEventListener('click', function (e) {
		if (!navbar.classList.contains('show') && !document.documentElement.classList.contains('nav-open')) return;
		// if click is inside navbar or on the button, ignore
		if (navbar.contains(e.target) || btn.contains(e.target)) return;
		setOpen(false);
	});

	// close on Escape
	document.addEventListener('keydown', function (e) {
		if (e.key === 'Escape' && (navbar.classList.contains('show') || document.documentElement.classList.contains('nav-open'))) {
			setOpen(false);
		}
	});

	// ensure initial aria attributes
	if (!btn.hasAttribute('aria-expanded')) btn.setAttribute('aria-expanded', 'false');
	if (!navbar.hasAttribute('aria-hidden')) navbar.setAttribute('aria-hidden', 'true');

	// close menu when resizing to desktop widths
	window.addEventListener('resize', () => {
		if (window.innerWidth > 768) {
			setOpen(false);
		}
	});

	// Optional: make sure nav links become focusable when shown (accessibility)
	const observer = new MutationObserver(() => {
		const links = navbar.querySelectorAll('a, button');
		if (navbar.classList.contains('show') || document.documentElement.classList.contains('nav-open')) {
			links.forEach(l => l.setAttribute('tabindex', '0'));
		} else {
			links.forEach(l => l.setAttribute('tabindex', '-1'));
		}
	});
	observer.observe(navbar, { attributes: true, attributeFilter: ['class'] });
})();