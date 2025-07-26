const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const xml2js = require('xml2js');
const app = express();
const port = process.env.PORT || 3000;

const parser = new xml2js.Parser();
app.use(express.json());
app.use(express.text({ type: 'application/xml' }));

// Use a file-based SQLite database named countydb.db in the project root
const dbPath = path.resolve(__dirname, 'countydb.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Failed to connect to database:', err.message);
  } else {
    console.log('Connected to SQLite database at', dbPath);
  }
});

// Create users and items tables if they don't exist
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    record INTEGER NOT NULL,
    name TEXT NOT NULL,
    quantity REAL NOT NULL,
    net_price REAL NOT NULL
  )`);
});

// GET /users — get all users
app.get('/users', (req, res) => {
  db.all('SELECT * FROM users', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// POST /users — add a new user
app.post('/users', (req, res) => {
  const { name, email } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }
  db.run(
    'INSERT INTO users (name, email) VALUES (?, ?)',
    [name, email],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({ id: this.lastID });
    }
  );
});

// POST /items/xml — receive and insert items from XML
app.post('/items/xml', (req, res) => {
  const xml = req.body;

  parser.parseString(xml, (err, result) => {
    if
