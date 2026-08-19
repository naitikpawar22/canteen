const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { initDB, dbGet, dbRun } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'mycanteen_secure_jwt_secret_key_2026';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// JWT Verification Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, message: 'Access token missing' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ success: false, message: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

// --- AUTH API ROUTES ---

// 1. SIGNUP
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { name, email, phone, password } = req.body;

        // Validation
        if (!name || !email || !password) {
            return res.status(400).json({ success: false, message: 'All fields are required.' });
        }

        if (name.trim().length < 2) {
            return res.status(400).json({ success: false, message: 'Name must be at least 2 characters.' });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
        }

        if (phone && !/^[0-9]{10}$/.test(phone.trim())) {
            return res.status(400).json({ success: false, message: 'Please enter a valid 10-digit mobile number.' });
        }

        if (password.length < 6) {
            return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
        }

        // Check if email already registered in SQLite
        const existingUser = await dbGet('SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()]);
        if (existingUser) {
            return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
        }

        // Hash Password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Generate default avatar SVG string or UI avatar URL
        const avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name.trim())}`;

        // Insert into SQLite DB
        const result = await dbRun(
            'INSERT INTO users (name, email, phone, password, avatar) VALUES (?, ?, ?, ?, ?)',
            [name.trim(), email.toLowerCase().trim(), phone ? phone.trim() : '', hashedPassword, avatarUrl]
        );

        const newUser = await dbGet('SELECT id, name, email, phone, avatar, created_at FROM users WHERE id = ?', [result.lastID]);

        // Create JWT Token
        const token = jwt.sign({ id: newUser.id, email: newUser.email }, JWT_SECRET, { expiresIn: '7d' });

        return res.status(201).json({
            success: true,
            message: '🎉 Account created successfully! Welcome aboard.',
            user: newUser,
            token
        });

    } catch (error) {
        console.error('Signup error:', error);
        return res.status(500).json({ success: false, message: 'Server error during registration.' });
    }
});

// 2. LOGIN
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required.' });
        }

        // Fetch user from SQLite
        const user = await dbGet('SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()]);

        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid email or password.' });
        }

        // Compare password with hashed password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid email or password.' });
        }

        // Create JWT Token
        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

        // Omit password from response
        const { password: _, ...userData } = user;

        return res.json({
            success: true,
            message: `Welcome back, ${userData.name}! 👋`,
            user: userData,
            token
        });

    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ success: false, message: 'Server error during authentication.' });
    }
});

// 3. GET CURRENT USER (AUTHENTICATED ROUTE)
app.get('/api/auth/me', authenticateToken, async (req, res) => {
    try {
        const user = await dbGet('SELECT id, name, email, phone, avatar, created_at FROM users WHERE id = ?', [req.user.id]);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found in SQLite database.' });
        }

        return res.json({
            success: true,
            user
        });
    } catch (error) {
        console.error('Get profile error:', error);
        return res.status(500).json({ success: false, message: 'Server error fetching user profile.' });
    }
});

// 4. GET SYSTEM STATS (Total SQLite user count)
app.get('/api/stats', async (req, res) => {
    try {
        const row = await dbGet('SELECT COUNT(*) AS total FROM users');
        return res.json({ success: true, count: row ? row.total : 0 });
    } catch (error) {
        return res.json({ success: true, count: 0 });
    }
});

// Fallback route for SPA
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Initialize DB and start server
initDB().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
});
