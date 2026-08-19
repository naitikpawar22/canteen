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

// Initialize Users Table
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
    try {
        await dbRun(createUsersTableSQL);
        // Ensure phone column exists for existing tables
        try {
            await dbRun('ALTER TABLE users ADD COLUMN phone TEXT');
        } catch (e) {
            // Column already exists, ignore
        }
        console.log('✅ SQLite `users` table initialized successfully.');
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
