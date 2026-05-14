const API_BASE_URL = 'http://localhost:8080/api';

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
async function handleAuth() {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    if (!email || !password) { showError('Email and password required.'); return; }

    try {
        if (isLoginMode) {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await response.json();

            if (response.ok && data.success) {
                localStorage.setItem('accessToken', data.token);
                localStorage.setItem('refreshToken', data.refreshToken);
                localStorage.setItem('user', JSON.stringify(data.user));
                // ADMIN REDIRECT
                if (email.toLowerCase() === 'admin2@gmail.com') window.location.href = 'gofast-admin.html';
                else window.location.href = 'gofast-working.html';
            } else {
                showError(data.message || 'Invalid credentials.');
            }
        } else {
            const fullName = fullNameInput.value.trim();
            if (!fullName) { showError('Full name required.'); return; }

            const response = await fetch(`${API_BASE_URL}/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fullName, email, password })
            });
            const data = await response.json();

            if (response.ok && data.success) {
                localStorage.setItem('accessToken', data.token);
                localStorage.setItem('refreshToken', data.refreshToken);
                localStorage.setItem('user', JSON.stringify(data.user));
                if (email.toLowerCase() === 'admin2@gmail.com') window.location.href = 'gofast-admin.html';
                else window.location.href = 'gofast-working.html';
            } else {
                showError(data.message || 'Signup failed.');
            }
        }
    } catch (err) {
        showError('Network error. Please try again.');
        console.error('Auth Error:', err);
    }
}
function toggleMode() { isLoginMode = !isLoginMode; updateUIMode(); errorBox.style.display = 'none'; passwordInput.value = ''; }
actionBtn.addEventListener('click', handleAuth);
toggleLink.addEventListener('click', toggleMode);
updateUIMode();

async function handleSignup(formData) {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (data.success) {
            // Store tokens
            localStorage.setItem('accessToken', data.token);
            localStorage.setItem('refreshToken', data.refreshToken);
            localStorage.setItem('user', JSON.stringify(data.user));

            // Redirect to dashboard
            window.location.href = 'gofast-working.html';
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('Signup error:', error);
    }
}

// Helper function for authenticated requests
async function apiCall(endpoint, method = 'GET', body = null) {
    const token = localStorage.getItem('accessToken');

    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    return response.json();
}