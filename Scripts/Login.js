const signupNameGroup = document.getElementById('signupNameGroup');
        const fullNameInput = document.getElementById('fullName');
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        const actionBtn = document.getElementById('actionButton');
        const errorBox = document.getElementById('errorBox');
        const togglePrompt = document.getElementById('togglePrompt');
        const toggleLink = document.getElementById('toggleLink');
        const formSubtext = document.getElementById('formSubtext');
        let isLoginMode = true;
        function showError(msg) { errorBox.textContent = msg; errorBox.style.display = 'block'; setTimeout(() => errorBox.style.display = 'none', 3500); }
        function updateUIMode() {
            if (isLoginMode) {
                signupNameGroup.style.display = 'none';
                actionBtn.textContent = 'Log In →';
                togglePrompt.textContent = "Don't have an account?";
                toggleLink.textContent = 'Create one';
                formSubtext.textContent = 'Log in to continue your journey';
            } else {
                signupNameGroup.style.display = 'block';
                actionBtn.textContent = 'Create account →';
                togglePrompt.textContent = "Already have an account?";
                toggleLink.textContent = 'Log in';
                formSubtext.textContent = 'Join GoFast and start booking';
            }
        }
        function login(email, password) {
            // Authentication will be handled by backend API
            return true;
        }
        function signup(name, email, password) {
            // Registration will be handled by backend API
            return { success: true };
        }
        function handleAuth() {
            const email = emailInput.value.trim();
            const password = passwordInput.value.trim();
            if (!email || !password) { showError('Email and password required.'); return; }
            if (isLoginMode) {
                if (login(email, password)) {
                    // ADMIN REDIRECT
                    if (email.toLowerCase() === 'admin2@gmail.com') window.location.href = 'gofast-admin.html';
                    else window.location.href = 'gofast-working.html';
                } else showError('Invalid credentials.');
            } else {
                const fullName = fullNameInput.value.trim();
                if (!fullName) { showError('Full name required.'); return; }
                const result = signup(fullName, email, password);
                if (result.success) {
                    if (email.toLowerCase() === 'admin2@gmail.com') window.location.href = 'gofast-admin.html';
                    else window.location.href = 'gofast-working.html';
                } else showError(result.error);
            }
        }
        function toggleMode() { isLoginMode = !isLoginMode; updateUIMode(); errorBox.style.display = 'none'; passwordInput.value = ''; }
        actionBtn.addEventListener('click', handleAuth);
        toggleLink.addEventListener('click', toggleMode);
        updateUIMode();