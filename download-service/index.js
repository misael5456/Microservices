// download-service: consulta los metadatos y devuelve el archivo.
const express = require('express');
const path = require('path');
const fs = require('fs');

const PORT = process.env.PORT || 5000;
const STORAGE_DIR = process.env.STORAGE_DIR || '/storage';
const METADATA_URL = process.env.METADATA_URL || 'http://metadata:5000';

const app = express();

app.get('/health', (req, res) => res.json({ service: 'download', status: 'ok' }));

app.get('/files/:id', async (req, res) => {
  let meta;
  try {
    const resp = await fetch(`${METADATA_URL}/metadata/${encodeURIComponent(req.params.id)}`);
    if (resp.status === 404) return res.status(404).json({ error: 'Archivo no encontrado' });
    if (!resp.ok) throw new Error(`metadata respondió ${resp.status}`);
    meta = await resp.json();
  } catch (err) {
    console.error('[download] error:', err.message);
    return res.status(503).json({ error: 'metadata no disponible' });
  }

  const filePath = path.join(STORAGE_DIR, path.basename(meta.storedName));
  if (!fs.existsSync(filePath)) {
    return res.status(410).json({ error: 'El archivo ya no existe en el almacenamiento' });
  }
  res.download(filePath, meta.originalName);
});

app.listen(PORT, () => console.log(`[download] escuchando en puerto ${PORT}`));
