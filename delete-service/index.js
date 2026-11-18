// delete-service: borra el archivo físico y su metadato.
const express = require('express');
const path = require('path');
const fs = require('fs/promises');

const PORT = process.env.PORT || 5000;
const STORAGE_DIR = process.env.STORAGE_DIR || '/storage';
const METADATA_URL = process.env.METADATA_URL || 'http://metadata:5000';

const app = express();

app.get('/health', (req, res) => res.json({ service: 'delete', status: 'ok' }));

app.delete('/files/:id', async (req, res) => {
  const url = `${METADATA_URL}/metadata/${encodeURIComponent(req.params.id)}`;
  try {
    const resp = await fetch(url);
    if (resp.status === 404) return res.status(404).json({ error: 'Archivo no encontrado' });
    if (!resp.ok) throw new Error(`metadata respondió ${resp.status}`);
    const meta = await resp.json();

    const del = await fetch(url, { method: 'DELETE' });
    if (!del.ok && del.status !== 404) throw new Error(`metadata respondió ${del.status}`);

    await fs.rm(path.join(STORAGE_DIR, path.basename(meta.storedName)), { force: true });
    res.json({ deleted: meta.id, name: meta.originalName });
  } catch (err) {
    console.error('[delete] error:', err.message);
    res.status(503).json({ error: 'No se pudo eliminar (metadata no disponible)' });
  }
});

app.listen(PORT, () => console.log(`[delete] escuchando en puerto ${PORT}`));
