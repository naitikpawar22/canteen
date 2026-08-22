const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { initDB, dbGet, dbRun, dbAll } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'mycanteen_secure_jwt_secret_key_2026';

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
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

// 4. ADMIN LOGIN (PASSWORD: admin@123)
app.post('/api/auth/admin-login', async (req, res) => {
    try {
        const { password } = req.body;

        if (!password) {
            return res.status(400).json({ success: false, message: 'Admin password is required.' });
        }

        if (password === 'admin@123') {
            const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '1d' });
            return res.json({
                success: true,
                message: '🔓 Admin access granted!',
                token
            });
        } else {
            return res.status(401).json({ success: false, message: 'Incorrect Admin Password!' });
        }
    } catch (error) {
        console.error('Admin login error:', error);
        return res.status(500).json({ success: false, message: 'Server error during admin authentication.' });
    }
});

// 5. GET SYSTEM STATS (Total SQLite user count)
app.get('/api/stats', async (req, res) => {
    try {
        const row = await dbGet('SELECT COUNT(*) AS total FROM users');
        return res.json({ success: true, count: row ? row.total : 0 });
    } catch (error) {
        return res.json({ success: true, count: 0 });
    }
});

// --- DISH MANAGEMENT API ROUTES ---

// GET ALL DISHES
app.get('/api/dishes', async (req, res) => {
    try {
        const dishes = await dbAll('SELECT * FROM dishes ORDER BY id DESC');
        return res.json({ success: true, dishes });
    } catch (error) {
        console.error('Error fetching dishes:', error);
        return res.status(500).json({ success: false, message: 'Failed to fetch dishes from database.' });
    }
});

// CREATE A NEW DISH
app.post('/api/dishes', async (req, res) => {
    try {
        const { name, category, price, discount, image, description, is_available } = req.body;

        if (!name || !category || price === undefined || price === null || price === '') {
            return res.status(400).json({ success: false, message: 'Dish name, category, and price are required.' });
        }

        const numericPrice = parseFloat(price);
        const numericDiscount = discount ? parseFloat(discount) : 0;
        const availableStatus = is_available !== undefined ? (is_available ? 1 : 0) : 1;
        const imageUrl = image && image.trim() !== '' ? image.trim() : 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=500&q=80';

        const result = await dbRun(
            `INSERT INTO dishes (name, category, price, discount, image, description, is_available)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [name.trim(), category.toLowerCase().trim(), numericPrice, numericDiscount, imageUrl, description ? description.trim() : '', availableStatus]
        );

        const newDish = await dbGet('SELECT * FROM dishes WHERE id = ?', [result.lastID]);

        return res.status(201).json({
            success: true,
            message: '🎉 Dish created successfully!',
            dish: newDish
        });
    } catch (error) {
        console.error('Error creating dish:', error);
        return res.status(500).json({ success: false, message: 'Server error while creating dish.' });
    }
});

// UPDATE DISH DETAILS
app.put('/api/dishes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, category, price, discount, image, description, is_available } = req.body;

        const existing = await dbGet('SELECT id FROM dishes WHERE id = ?', [id]);
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Dish not found.' });
        }

        const numericPrice = parseFloat(price);
        const numericDiscount = discount !== undefined ? parseFloat(discount) : 0;
        const availableStatus = is_available !== undefined ? (is_available ? 1 : 0) : 1;
        const imageUrl = image && image.trim() !== '' ? image.trim() : 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=500&q=80';

        await dbRun(
            `UPDATE dishes 
             SET name = ?, category = ?, price = ?, discount = ?, image = ?, description = ?, is_available = ?
             WHERE id = ?`,
            [name.trim(), category.toLowerCase().trim(), numericPrice, numericDiscount, imageUrl, description ? description.trim() : '', availableStatus, id]
        );

        const updatedDish = await dbGet('SELECT * FROM dishes WHERE id = ?', [id]);

        return res.json({
            success: true,
            message: '✅ Dish updated successfully!',
            dish: updatedDish
        });
    } catch (error) {
        console.error('Error updating dish:', error);
        return res.status(500).json({ success: false, message: 'Server error while updating dish.' });
    }
});

// DELETE DISH
app.delete('/api/dishes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const existing = await dbGet('SELECT id FROM dishes WHERE id = ?', [id]);
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Dish not found.' });
        }

        await dbRun('DELETE FROM dishes WHERE id = ?', [id]);
        return res.json({ success: true, message: '🗑️ Dish deleted successfully!' });
    } catch (error) {
        console.error('Error deleting dish:', error);
        return res.status(500).json({ success: false, message: 'Server error while deleting dish.' });
    }
});

// --- ORDERS API ROUTES ---

// 1. PLACE NEW ORDER (STUDENT)
app.post('/api/orders', async (req, res) => {
    try {
        const { user_name, user_email, items, total_amount, payment_method } = req.body;

        if (!items || !items.length || !total_amount) {
            return res.status(400).json({ success: false, message: 'Cart items and total amount are required.' });
        }

        const name = user_name || 'Student Customer';
        const email = user_email || 'student@canteen.com';
        const payMethod = payment_method || 'Pay Now (PhonePe)';
        const payStatus = payMethod.includes('Pay Now') ? 'Paid' : 'Pending';
        const itemsJson = JSON.stringify(items);

        const result = await dbRun(
            `INSERT INTO orders (user_name, user_email, items, total_amount, payment_method, payment_status, order_status)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [name, email, itemsJson, parseFloat(total_amount), payMethod, payStatus, 'Preparing']
        );

        const newOrder = await dbGet('SELECT * FROM orders WHERE id = ?', [result.lastID]);

        return res.status(201).json({
            success: true,
            message: '🎉 Order placed successfully!',
            order: newOrder
        });

    } catch (error) {
        console.error('Error placing order:', error);
        return res.status(500).json({ success: false, message: 'Server error while placing order.' });
    }
});

// 2. GET ALL ORDERS (ADMIN)
app.get('/api/orders', async (req, res) => {
    try {
        const orders = await dbAll('SELECT * FROM orders ORDER BY id DESC');
        const formattedOrders = orders.map(order => {
            let parsedItems = [];
            try {
                parsedItems = JSON.parse(order.items);
            } catch (e) {
                parsedItems = [];
            }
            return {
                ...order,
                items: parsedItems
            };
        });
        return res.json({ success: true, orders: formattedOrders });
    } catch (error) {
        console.error('Error fetching orders:', error);
        return res.status(500).json({ success: false, message: 'Server error fetching orders.' });
    }
});

// 2.1 GET ORDERS FOR SPECIFIC STUDENT
app.get('/api/orders/user/:email', async (req, res) => {
    try {
        const { email } = req.params;
        const orders = await dbAll('SELECT * FROM orders WHERE user_email = ? ORDER BY id DESC', [email]);
        const formattedOrders = orders.map(order => {
            let parsedItems = [];
            try { parsedItems = JSON.parse(order.items); } catch(e) {}
            return { ...order, items: parsedItems };
        });
        return res.json({ success: true, orders: formattedOrders });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Server error fetching student orders.' });
    }
});

// 3. UPDATE ORDER STATUS (ADMIN)
app.put('/api/orders/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { order_status, payment_status } = req.body;

        const existing = await dbGet('SELECT * FROM orders WHERE id = ?', [id]);
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Order not found.' });
        }

        const newOrderStatus = order_status || existing.order_status;
        const newPaymentStatus = payment_status || existing.payment_status;

        await dbRun(
            'UPDATE orders SET order_status = ?, payment_status = ? WHERE id = ?',
            [newOrderStatus, newPaymentStatus, id]
        );

        return res.json({
            success: true,
            message: `Order #${id} updated to ${newOrderStatus}!`
        });

    } catch (error) {
        console.error('Error updating order:', error);
        return res.status(500).json({ success: false, message: 'Server error updating order.' });
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
