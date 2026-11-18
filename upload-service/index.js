// upload-service: recibe un archivo, lo guarda en el volumen y registra sus metadatos.
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 5000;
const STORAGE_DIR = process.env.STORAGE_DIR || '/storage';
const METADATA_URL = process.env.METADATA_URL || 'http://metadata:5000';
const MAX_SIZE_MB = Number(process.env.MAX_SIZE_MB || 20);

fs.mkdirSync(STORAGE_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: STORAGE_DIR,
  filename: (req, file, cb) => cb(null, crypto.randomUUID() + path.extname(file.originalname)),
});
const upload = multer({ storage, limits: { fileSize: MAX_SIZE_MB * 1024 * 1024 } });

const app = express();

app.get('/health', (req, res) => res.json({ service: 'upload', status: 'ok' }));

app.post('/files', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Envía un archivo en el campo "file"' });

  try {
    const resp = await fetch(`${METADATA_URL}/metadata`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        originalName: req.file.originalname,
        storedName: req.file.filename,
        size: req.file.size,
        mimeType: req.file.mimetype,
      }),
    });
    if (!resp.ok) throw new Error(`metadata respondió ${resp.status}`);
    res.status(201).json(await resp.json());
  } catch (err) {

    fs.rm(req.file.path, { force: true }, () => {});
    console.error('[upload] error:', err.message);
    res.status(503).json({ error: 'No se pudo registrar el archivo (metadata no disponible)' });
  }
});

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) return res.status(413).json({ error: err.message });
  next(err);
});

app.listen(PORT, () => console.log(`[upload] escuchando en puerto ${PORT}`));
