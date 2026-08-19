
document.addEventListener('DOMContentLoaded', () => {
    // --- DOM ELEMENTS ---
    const authCard = document.getElementById('authCard');
    const dashboardCard = document.getElementById('dashboardCard');

    // Tabs & Forms
    const tabSignInBtn = document.getElementById('tabSignInBtn');
    const tabSignUpBtn = document.getElementById('tabSignUpBtn');
    const tabIndicator = document.getElementById('tabIndicator');
    const signInForm = document.getElementById('signInForm');
    const signUpForm = document.getElementById('signUpForm');

    // Art Panel Elements
    const artTitle = document.getElementById('artTitle');
    const artSubtitle = document.getElementById('artSubtitle');
    const artToggleText = document.getElementById('artToggleText');
    const artToggleBtn = document.getElementById('artToggleBtn');

    // Password Toggles & Strength
    const togglePasswordBtns = document.querySelectorAll('.toggle-password');
    const signUpPasswordInput = document.getElementById('signUpPassword');
    const signUpConfirmInput = document.getElementById('signUpConfirmPassword');
    const strengthFill = document.getElementById('strengthFill');
    const strengthText = document.getElementById('strengthText');
    const passwordMatchIcon = document.getElementById('passwordMatchIcon');

    // Dashboard Elements
    const dashAvatar = document.getElementById('dashAvatar');
    const dashUserName = document.getElementById('dashUserName');
    const dashUserEmail = document.getElementById('dashUserEmail');
    const dashUserId = document.getElementById('dashUserId');
    const dashUserJoined = document.getElementById('dashUserJoined');
    const logoutBtn = document.getElementById('logoutBtn');
    const canteenMenuBtn = document.getElementById('canteenMenuBtn');

    // PhonePe Overlay Elements
    const phonepeOverlay = document.getElementById('phonepeOverlay');
    const phonepeTitle = document.getElementById('phonepeTitle');
    const phonepeUserName = document.getElementById('phonepeUserName');
    const phonepeUserEmail = document.getElementById('phonepeUserEmail');
    const phonepePhoneRow = document.getElementById('phonepePhoneRow');
    const phonepeUserPhone = document.getElementById('phonepeUserPhone');
    const phonepeTxnId = document.getElementById('phonepeTxnId');
    const countdownSec = document.getElementById('countdownSec');
    const redirectProgressFill = document.getElementById('redirectProgressFill');
    const skipToHomeBtn = document.getElementById('skipToHomeBtn');
    const confettiContainer = document.getElementById('confettiContainer');

    // Header & Stats
    const userCountEl = document.getElementById('userCount');

    // Forgot Password Modal
    const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');
    const forgotModal = document.getElementById('forgotModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const cancelResetBtn = document.getElementById('cancelResetBtn');
    const sendResetBtn = document.getElementById('sendResetBtn');
    const resetEmailInput = document.getElementById('resetEmail');

    // Toast Container
    const toastContainer = document.getElementById('toastContainer');

    let currentTab = 'signin'; // 'signin' | 'signup'
    let countdownInterval = null;

    // --- INITIALIZATION ---
    fetchUserCount();
    checkExistingSession();

    // --- TAB & FORM SWITCHING LOGIC ---
    function switchTab(target) {
        if (target === currentTab) return;
        currentTab = target;

        if (target === 'signin') {
            tabSignInBtn.classList.add('active');
            tabSignUpBtn.classList.remove('active');
            tabIndicator.style.left = '4px';

            signInForm.classList.add('active');
            signUpForm.classList.remove('active');

            artTitle.innerHTML = 'Delicious Meals,<br>One Click Away';
            artSubtitle.textContent = 'Access your favorite canteen treats, track meal orders, and enjoy exclusive member discounts.';
            artToggleText.textContent = "Don't have an account yet?";
            artToggleBtn.querySelector('span').textContent = 'Create Account';
        } else {
            tabSignUpBtn.classList.add('active');
            tabSignInBtn.classList.remove('active');
            tabIndicator.style.left = 'calc(50% + 0px)';

            signUpForm.classList.add('active');
            signInForm.classList.remove('active');

            artTitle.innerHTML = 'Join Our Canteen<br>Community Today!';
            artSubtitle.textContent = 'Create a free account to unlock rapid checkout, customized meal preferences, and SQLite sync.';
            artToggleText.textContent = 'Already registered?';
            artToggleBtn.querySelector('span').textContent = 'Sign In';
        }
    }

    tabSignInBtn.addEventListener('click', () => switchTab('signin'));
    tabSignUpBtn.addEventListener('click', () => switchTab('signup'));
    artToggleBtn.addEventListener('click', () => {
        switchTab(currentTab === 'signin' ? 'signup' : 'signin');
    });

    // --- PASSWORD VISIBILITY TOGGLE ---
    togglePasswordBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            const inputField = document.getElementById(targetId);
            const icon = btn.querySelector('i');

            if (inputField.type === 'password') {
                inputField.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                inputField.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
    });

    // --- PASSWORD STRENGTH & MATCH CHECKING ---
    signUpPasswordInput.addEventListener('input', (e) => {
        const val = e.target.value;
        const result = checkPasswordStrength(val);

        strengthFill.className = 'strength-fill ' + result.class;
        strengthText.textContent = val ? `Password Strength: ${result.label}` : 'Password Strength';
        checkPasswordMatch();
    });

    signUpConfirmInput.addEventListener('input', checkPasswordMatch);

    function checkPasswordStrength(password) {
        if (!password) return { class: '', label: 'Password Strength' };

        let score = 0;
        if (password.length >= 6) score++;
        if (password.length >= 10) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;

        if (score <= 2) {
            return { class: 'weak', label: 'Weak ⚠️' };
        } else if (score <= 4) {
            return { class: 'medium', label: 'Medium ⚡' };
        } else {
            return { class: 'strong', label: 'Strong 💪' };
        }
    }

    function checkPasswordMatch() {
        const pwd = signUpPasswordInput.value;
        const confirm = signUpConfirmInput.value;

        if (confirm.length > 0) {
            passwordMatchIcon.classList.remove('hidden');
            if (pwd === confirm) {
                passwordMatchIcon.style.color = 'var(--success)';
                passwordMatchIcon.innerHTML = '<i class="fa-solid fa-circle-check"></i>';
            } else {
                passwordMatchIcon.style.color = 'var(--danger)';
                passwordMatchIcon.innerHTML = '<i class="fa-solid fa-circle-xmark"></i>';
            }
        } else {
            passwordMatchIcon.classList.add('hidden');
        }
    }

    // --- SIGN IN FORM SUBMISSION (SQLITE AUTH) ---
    signInForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearErrors();

        const email = document.getElementById('signInEmail').value.trim();
        const password = document.getElementById('signInPassword').value;
        const submitBtn = document.getElementById('signInSubmit');

        let isValid = true;

        if (!email) {
            showError('signInEmailError', 'Please enter your email.');
            isValid = false;
        }

        if (!password) {
            showError('signInPasswordError', 'Please enter your password.');
            isValid = false;
        }

        if (!isValid) return;

        setLoading(submitBtn, true);

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();
            setLoading(submitBtn, false);

            if (data.success) {
                localStorage.setItem('canteen_token', data.token);
                triggerPhonePeSuccessAndRedirect(data.user, 'Login Successful!');
            } else {
                showToast(data.message || 'Login failed', 'error');
                showError('signInPasswordError', data.message);
            }
        } catch (err) {
            setLoading(submitBtn, false);
            showToast('Network error connecting to backend API.', 'error');
        }
    });

    // Auto-restrict Mobile Number input to numeric digits
    const signUpPhoneInput = document.getElementById('signUpPhone');
    if (signUpPhoneInput) {
        signUpPhoneInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^0-9]/g, '');
        });
    }

    // --- SIGN UP FORM SUBMISSION (SQLITE DB INSERTION) ---
    signUpForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearErrors();

        const name = document.getElementById('signUpName').value.trim();
        const email = document.getElementById('signUpEmail').value.trim();
        const phone = document.getElementById('signUpPhone').value.trim();
        const password = signUpPasswordInput.value;
        const confirmPassword = signUpConfirmInput.value;
        const termsCheck = document.getElementById('termsCheck').checked;
        const submitBtn = document.getElementById('signUpSubmit');

        let isValid = true;

        if (!name || name.length < 2) {
            showError('signUpNameError', 'Name must be at least 2 characters.');
            isValid = false;
        }

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            showError('signUpEmailError', 'Please enter a valid email address.');
            isValid = false;
        }

        if (!phone || !/^[0-9]{10}$/.test(phone)) {
            showError('signUpPhoneError', 'Please enter a valid 10-digit mobile number.');
            isValid = false;
        }

        if (!password || password.length < 6) {
            showError('signUpPasswordError', 'Password must be at least 6 characters.');
            isValid = false;
        }

        if (password !== confirmPassword) {
            showError('signUpConfirmError', 'Passwords do not match.');
            isValid = false;
        }

        if (!termsCheck) {
            showToast('You must accept the Terms of Service to sign up.', 'error');
            isValid = false;
        }

        if (!isValid) return;

        setLoading(submitBtn, true);

        try {
            const response = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, phone, password })
            });

            const data = await response.json();
            setLoading(submitBtn, false);

            if (data.success) {
                localStorage.setItem('canteen_token', data.token);
                fetchUserCount(); // Refresh total count
                triggerPhonePeSuccessAndRedirect(data.user, 'Account Created Successfully!');
            } else {
                showToast(data.message || 'Signup failed', 'error');
                if (data.message.includes('email')) {
                    showError('signUpEmailError', data.message);
                }
            }
        } catch (err) {
            setLoading(submitBtn, false);
            showToast('Network error connecting to backend SQLite API.', 'error');
        }
    });

    // --- PHONEPE STYLE SUCCESS ANIMATION & REDIRECT ---
    function triggerPhonePeSuccessAndRedirect(user, title = 'Authentication Successful!') {
        if (!phonepeOverlay) {
            window.location.href = 'Home/index.html';
            return;
        }

        if (phonepeTitle) phonepeTitle.textContent = title;
        phonepeUserName.textContent = user.name;
        phonepeUserEmail.textContent = user.email;

        if (phonepeUserPhone && user.phone) {
            phonepeUserPhone.textContent = user.phone.startsWith('+91') ? user.phone : `+91 ${user.phone}`;
            if (phonepePhoneRow) phonepePhoneRow.style.display = 'flex';
        } else if (phonepePhoneRow) {
            phonepePhoneRow.style.display = 'none';
        }

        phonepeTxnId.textContent = `TXN-SQLITE-${Math.floor(100000 + Math.random() * 900000)}`;

        phonepeOverlay.classList.remove('hidden');

        // Play PhonePe chime sound effect synth
        playPhonePeChime();
        // Trigger particle confetti
        triggerConfetti();

        // 3 Seconds Countdown
        let secondsLeft = 3;
        if (countdownSec) countdownSec.textContent = secondsLeft;
        if (redirectProgressFill) redirectProgressFill.style.width = '0%';

        let progress = 0;
        const progressInterval = setInterval(() => {
            progress += 2;
            if (redirectProgressFill) redirectProgressFill.style.width = Math.min(progress, 100) + '%';
            if (progress >= 100) clearInterval(progressInterval);
        }, 60);

        countdownInterval = setInterval(() => {
            secondsLeft--;
            if (secondsLeft >= 0 && countdownSec) {
                countdownSec.textContent = secondsLeft;
            }
            if (secondsLeft <= 0) {
                clearInterval(countdownInterval);
                redirectToHome();
            }
        }, 1000);

        if (skipToHomeBtn) {
            skipToHomeBtn.onclick = () => {
                clearInterval(countdownInterval);
                clearInterval(progressInterval);
                redirectToHome();
            };
        }
    }

    function redirectToHome() {
        window.location.href = 'Home/index.html';
    }

    // Web Audio API PhonePe Chime Sound Effect Synthesizer
    function playPhonePeChime() {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            const ctx = new AudioContext();

            // First note (E5: ~659 Hz)
            const osc1 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(659.25, ctx.currentTime);
            gain1.gain.setValueAtTime(0.35, ctx.currentTime);
            gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
            osc1.connect(gain1);
            gain1.connect(ctx.destination);
            osc1.start(ctx.currentTime);
            osc1.stop(ctx.currentTime + 0.35);

            // Second note (B5: ~987 Hz)
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(987.77, ctx.currentTime + 0.15);
            gain2.gain.setValueAtTime(0.45, ctx.currentTime + 0.15);
            gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.start(ctx.currentTime + 0.15);
            osc2.stop(ctx.currentTime + 0.7);
        } catch (e) {
            console.log('Audio chime error:', e);
        }
    }

    // Confetti particles generator
    function triggerConfetti() {
        if (!confettiContainer) return;
        confettiContainer.innerHTML = '';
        const colors = ['#10b981', '#8b5cf6', '#06b6d4', '#ec4899', '#f59e0b', '#3b82f6'];
        for (let i = 0; i < 35; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti-piece';
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.animationDelay = (Math.random() * 0.8) + 's';
            confetti.style.animationDuration = (2 + Math.random() * 2) + 's';
            confettiContainer.appendChild(confetti);
        }
    }

    // --- RESTORE SESSION / CHECK JWT ---
    async function checkExistingSession() {
        const token = localStorage.getItem('canteen_token');
        if (!token) return;

        try {
            const response = await fetch('/api/auth/me', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();

            if (data.success && data.user) {
                window.location.href = 'Home/index.html';
            } else {
                localStorage.removeItem('canteen_token');
            }
        } catch (err) {
            console.error('Session restore failed:', err);
        }
    }

    // --- FETCH TOTAL SQLITE USER COUNT ---
    async function fetchUserCount() {
        try {
            const response = await fetch('/api/stats');
            const data = await response.json();
            if (data.success && userCountEl) {
                userCountEl.textContent = data.count;
            }
        } catch (err) {
            console.error('Fetch user count failed');
        }
    }

    // --- SHOW DASHBOARD (IF STILL NEEDED) ---
    function showDashboard(user) {
        authCard.classList.add('hidden');
        dashboardCard.classList.remove('hidden');

        dashUserName.textContent = user.name;
        dashUserEmail.textContent = user.email;
        dashUserId.textContent = `#${String(user.id).padStart(4, '0')}`;
        dashAvatar.src = user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.name)}`;

        const createdDate = user.created_at ? new Date(user.created_at).toLocaleDateString(undefined, {
            year: 'numeric', month: 'short', day: 'numeric'
        }) : 'Today';
        dashUserJoined.textContent = createdDate;
    }

    // --- LOGOUT LOGIC ---
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('canteen_token');
        dashboardCard.classList.add('hidden');
        authCard.classList.remove('hidden');
        showToast('Signed out successfully. See you soon!', 'info');
        switchTab('signin');
        fetchUserCount();
    });

    canteenMenuBtn.addEventListener('click', () => {
        redirectToHome();
    });

    // --- FORGOT PASSWORD MODAL HANDLERS ---
    forgotPasswordBtn.addEventListener('click', (e) => {
        e.preventDefault();
        forgotModal.classList.remove('hidden');
    });

    closeModalBtn.addEventListener('click', () => forgotModal.classList.add('hidden'));
    cancelResetBtn.addEventListener('click', () => forgotModal.classList.add('hidden'));

    sendResetBtn.addEventListener('click', () => {
        const email = resetEmailInput.value.trim();
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            showToast('Please enter a valid email address.', 'error');
            return;
        }

        forgotModal.classList.add('hidden');
        resetEmailInput.value = '';
        showToast(`📬 Password reset link sent to ${email}! Check your inbox.`, 'success');
    });

    // --- HELPERS & TOAST NOTIFICATIONS ---
    function showError(elementId, message) {
        const el = document.getElementById(elementId);
        if (el) {
            el.textContent = message;
            el.classList.add('visible');
        }
    }

    function clearErrors() {
        document.querySelectorAll('.error-msg').forEach(el => {
            el.textContent = '';
            el.classList.remove('visible');
        });
    }

    function setLoading(button, isLoading) {
        const btnText = button.querySelector('.btn-text');
        const spinner = button.querySelector('.btn-spinner');

        if (isLoading) {
            button.disabled = true;
            btnText.style.opacity = '0';
            spinner.classList.remove('hidden');
        } else {
            button.disabled = false;
            btnText.style.opacity = '1';
            spinner.classList.add('hidden');
        }
    }

    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const iconMap = {
            success: 'fa-circle-check',
            error: 'fa-circle-exclamation',
            info: 'fa-circle-info'
        };

        toast.innerHTML = `
            <i class="fa-solid ${iconMap[type] || 'fa-circle-info'} toast-icon"></i>
            <span>${message}</span>
        `;

        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideInRight 0.3s reverse forwards';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }
});
