import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';

const DB_PATH = path.join(process.cwd(), 'data', 'group-buy.db');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  initSchema(db);
  return db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      email TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS group_buys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE,
      title TEXT NOT NULL,
      description TEXT,
      image_url TEXT,
      organizer_id INTEGER NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      is_public INTEGER NOT NULL DEFAULT 0,
      is_locked INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (organizer_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS options (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_buy_id INTEGER NOT NULL,
      label TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      image_url TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (group_buy_id) REFERENCES group_buys(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_buy_id INTEGER NOT NULL,
      participant_name TEXT NOT NULL,
      is_paid INTEGER NOT NULL DEFAULT 0,
      paid_by INTEGER,
      paid_at DATETIME,
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (group_buy_id) REFERENCES group_buys(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      option_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (option_id) REFERENCES options(id)
    );

    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at DATETIME NOT NULL,
      used INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Migrations for existing databases
  const userCols = db.prepare("PRAGMA table_info(users)").all() as { name: string }[];
  if (!userCols.find(c => c.name === 'email')) {
    db.exec("ALTER TABLE users ADD COLUMN email TEXT");
  }
  const optCols = db.prepare("PRAGMA table_info(options)").all() as { name: string }[];
  if (!optCols.find(c => c.name === 'image_url')) {
    db.exec("ALTER TABLE options ADD COLUMN image_url TEXT");
  }
  const orderCols = db.prepare("PRAGMA table_info(orders)").all() as { name: string }[];
  if (!orderCols.find(c => c.name === 'user_id')) {
    db.exec("ALTER TABLE orders ADD COLUMN user_id INTEGER REFERENCES users(id)");
  }

  // Add slug to group_buys if missing, then backfill existing rows
  const gbCols = db.prepare("PRAGMA table_info(group_buys)").all() as { name: string }[];
  if (!gbCols.find(c => c.name === 'slug')) {
    db.exec("ALTER TABLE group_buys ADD COLUMN slug TEXT");
  }
  const unsluggedRows = db.prepare("SELECT id FROM group_buys WHERE slug IS NULL OR slug = ''").all() as { id: number }[];
  for (const row of unsluggedRows) {
    let s = Math.random().toString(36).slice(2, 10);
    while (db.prepare("SELECT id FROM group_buys WHERE slug = ?").get(s)) {
      s = Math.random().toString(36).slice(2, 10);
    }
    db.prepare("UPDATE group_buys SET slug = ? WHERE id = ?").run(s, row.id);
  }

  // Create admin user if not exists
  const admin = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  if (!admin) {
    const hash = bcrypt.hashSync('admin1234', 10);
    db.prepare(
      'INSERT INTO users (username, display_name, password_hash, role) VALUES (?, ?, ?, ?)'
    ).run('admin', '管理員', hash, 'admin');
  }
}
