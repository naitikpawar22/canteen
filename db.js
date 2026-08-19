const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const DB_PATH = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('❌ Could not connect to SQLite database:', err.message);
    } else {
        console.log('⚡ Connected to SQLite database at', DB_PATH);
    }
});

// Promisified DB helpers for clean async/await code
const dbRun = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve({ lastID: this.lastID, changes: this.changes });
        });
    });
};

const dbGet = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

const dbAll = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

// Initialize Tables
const initDB = async () => {
    const createUsersTableSQL = `
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            phone TEXT,
            password TEXT NOT NULL,
            avatar TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `;

    const createDishesTableSQL = `
        CREATE TABLE IF NOT EXISTS dishes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            price REAL NOT NULL,
            image TEXT,
            description TEXT,
            discount REAL DEFAULT 0,
            is_available INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `;

    try {
        await dbRun(createUsersTableSQL);
        // Ensure phone column exists for existing tables
        try {
            await dbRun('ALTER TABLE users ADD COLUMN phone TEXT');
        } catch (e) {
            // Column already exists, ignore
        }
        console.log('✅ SQLite `users` table initialized successfully.');

        await dbRun(createDishesTableSQL);
        console.log('✅ SQLite `dishes` table initialized successfully.');

        // Seed initial dishes if empty
        const count = await dbGet('SELECT COUNT(*) as count FROM dishes');
        if (count && count.count === 0) {
            console.log('🌱 Seeding initial dish items into SQLite...');
            const defaultDishes = [
                { name: "Crispy Cheese Burger", category: "fastfood", price: 120, discount: 10, image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=500&q=80", description: "Loaded with melted cheddar cheese & fresh lettuce." },
                { name: "Paneer Butter Masala Thali", category: "meals", price: 180, discount: 15, image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=500&q=80", description: "Served with 3 Butter Naans, Jeera Rice & Gulab Jamun." },
                { name: "Pepperoni Deluxe Pizza", category: "fastfood", price: 250, discount: 20, image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=500&q=80", description: "Classic mozzarella crust with spicy herbs." },
                { name: "Cold Coffee with Ice Cream", category: "drinks", price: 80, discount: 0, image: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=500&q=80", description: "Thick brewed espresso topped with vanilla scoop." },
                { name: "Samosa & Mint Chutney (2 Pcs)", category: "fastfood", price: 40, discount: 0, image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=500&q=80", description: "Crispy golden pastry stuffed with spicy potato." },
                { name: "Choco Lava Cake", category: "dessert", price: 90, discount: 5, image: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=500&q=80", description: "Gooey warm chocolate center cake." },
                { name: "Masala Dosa with Sambhar", category: "meals", price: 110, discount: 10, image: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=500&q=80", description: "Crispy crepe filled with tempered potato mash." },
                { name: "Fresh Mango Smoothie", category: "drinks", price: 75, discount: 0, image: "https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&w=500&q=80", description: "Real Alphonso pulp blended with chilled yogurt." }
            ];

            for (const item of defaultDishes) {
                await dbRun(
                    `INSERT INTO dishes (name, category, price, discount, image, description, is_available) 
                     VALUES (?, ?, ?, ?, ?, ?, 1)`,
                    [item.name, item.category, item.price, item.discount, item.image, item.description]
                );
            }
            console.log('✅ 8 Initial dishes seeded successfully.');
        }

    } catch (err) {
        console.error('❌ Database table initialization failed:', err);
    }
};

module.exports = {
    db,
    dbRun,
    dbGet,
    dbAll,
    initDB
};
