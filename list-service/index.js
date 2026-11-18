// list-service: lista archivos. Solo necesita metadatos, por eso NO monta el volumen.
const express = require('express');

const PORT = process.env.PORT || 5000;
const METADATA_URL = process.env.METADATA_URL || 'http://metadata:5000';

const app = express();

app.get('/health', (req, res) => res.json({ service: 'list', status: 'ok' }));

app.get('/files', async (req, res) => {
  const params = new URLSearchParams();
  if (req.query.name) params.set('name', req.query.name);
  if (req.query.ext) params.set('ext', req.query.ext);

  try {
    const resp = await fetch(`${METADATA_URL}/metadata?${params}`);
    if (!resp.ok) throw new Error(`metadata respondió ${resp.status}`);
    const files = await resp.json();
    res.json({
      total: files.length,
      files: files.map(({ id, originalName, size, mimeType, createdAt }) =>
        ({ id, name: originalName, size, mimeType, createdAt })),
    });
  } catch (err) {
    console.error('[list] error:', err.message);
    res.status(503).json({ error: 'metadata no disponible' });
  }
});

app.listen(PORT, () => console.log(`[list] escuchando en puerto ${PORT}`));
