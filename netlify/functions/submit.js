const { Client } = require('pg');
const { getStore } = require('@netlify/blobs');
const Busboy = require('busboy');
const { randomUUID } = require('crypto');

function parseMultipart(event) {
  return new Promise((resolve, reject) => {
    const fields = {};
    const files = {};
    const bb = Busboy({
      headers: { 'content-type': event.headers['content-type'] }
    });
    bb.on('field', (name, val) => { fields[name] = val; });
    bb.on('file', (name, stream, info) => {
      const chunks = [];
      stream.on('data', d => chunks.push(d));
      stream.on('end', () => {
        files[name] = { buffer: Buffer.concat(chunks), mimetype: info.mimeType, filename: info.filename };
      });
    });
    bb.on('close', () => resolve({ fields, files }));
    bb.on('error', reject);
    const body = Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf8');
    bb.write(body);
    bb.end();
  });
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  const dbUrl = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
  if (!dbUrl) return { statusCode: 500, headers, body: JSON.stringify({ error: 'No database URL found' }) };

  try {
    const { fields, files } = await parseMultipart(event);
    const { title, artist_name, artist_url, description, tags_raw } = fields;

    if (!title || !artist_name) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing required fields' }) };
    }
    if (!files.print_file || !files.thumbnail) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Both a print file and thumbnail are required' }) };
    }

    const store = getStore('sticker-files');
    const printKey = `print/${randomUUID()}`;
    const thumbKey = `thumb/${randomUUID()}`;

    await store.set(printKey, files.print_file.buffer, { metadata: { mimetype: files.print_file.mimetype, filename: files.print_file.filename } });
    await store.set(thumbKey, files.thumbnail.buffer, { metadata: { mimetype: files.thumbnail.mimetype } });

    const tags = (tags_raw || '').split(',').map(t => t.trim()).filter(Boolean);
    const download_url = `/api/file?key=${encodeURIComponent(printKey)}`;
    const thumbnail_url = `/api/file?key=${encodeURIComponent(thumbKey)}`;

    const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
    await client.connect();
    await client.query(
      `INSERT INTO stickers (title, artist_name, artist_url, description, tags, download_url, thumbnail_url, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')`,
      [
        title.substring(0, 200),
        artist_name.substring(0, 100),
        artist_url || null,
        description ? description.substring(0, 1000) : null,
        tags,
        download_url,
        thumbnail_url
      ]
    );
    await client.end();

    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
  } catch (err) {
    console.error('Submit error:', err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
