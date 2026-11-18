// metadata-service: único dueño de los metadatos de los archivos.
const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 5000;
const DATA_DIR = process.env.DATA_DIR || '/data';
const DB_FILE = path.join(DATA_DIR, 'metadata.json');

fs.mkdirSync(DATA_DIR, { recursive: true });

function load() {
  try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); }
  catch { return {}; }
}
function save(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

const app = express();
app.use(express.json());

app.get('/health', (req, res) => res.json({ service: 'metadata', status: 'ok' }));

app.post('/metadata', (req, res) => {
  const { originalName, storedName, size, mimeType } = req.body;
  if (!originalName || !storedName) {
    return res.status(400).json({ error: 'originalName y storedName son obligatorios' });
  }
  const db = load();
  const id = crypto.randomUUID();
  db[id] = { id, originalName, storedName, size, mimeType, createdAt: new Date().toISOString() };
  save(db);
  res.status(201).json(db[id]);
});

app.get('/metadata', (req, res) => {
  const { name, ext } = req.query;
  let files = Object.values(load());
  if (name) files = files.filter(f => f.originalName.toLowerCase().includes(name.toLowerCase()));
  if (ext) files = files.filter(f => f.originalName.toLowerCase().endsWith('.' + ext.toLowerCase()));
  files.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  res.json(files);
});

app.get('/metadata/:id', (req, res) => {
  const file = load()[req.params.id];
  if (!file) return res.status(404).json({ error: 'Archivo no encontrado' });
  res.json(file);
});

app.delete('/metadata/:id', (req, res) => {
  const db = load();
  if (!db[req.params.id]) return res.status(404).json({ error: 'Archivo no encontrado' });
  delete db[req.params.id];
  save(db);
  res.status(204).end();
});

app.listen(PORT, () => console.log(`[metadata] escuchando en puerto ${PORT}`));
