const { Client } = require('pg');
const { getStore } = require('@netlify/blobs');
const Busboy = require('busboy');

function getBlobStore() {
  return getStore({ name: 'sticker-files', siteID: process.env.SITE_ID, token: process.env.NETLIFY_TOKEN });
}

function parseMultipart(event) {
  return new Promise((resolve, reject) => {
    const fields = {};
    const files = {};
    const bb = Busboy({ headers: { 'content-type': event.headers['content-type'] } });
    bb.on('field', (name, val) => { fields[name] = val; });
    bb.on('file', (name, stream, info) => {
      const chunks = [];
      stream.on('data', d => chunks.push(d));
      stream.on('end', () => { files[name] = { buffer: Buffer.concat(chunks), mimetype: info.mimeType, filename: info.filename }; });
    });
    bb.on('close', () => resolve({ fields, files }));
    bb.on('error', reject);
    const body = Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf8');
    bb.write(body);
    bb.end();
  });
}

exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Content-Type': 'application/json' };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  const dbUrl = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
  if (!dbUrl) return { statusCode: 500, headers, body: JSON.stringify({ error: 'No database URL found' }) };

  // GET — fetch artist profile
  if (event.httpMethod === 'GET') {
    const name = (event.queryStringParameters || {}).name;
    if (!name) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing name' }) };
    const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
    try {
      await client.connect();
      const result = await client.query(
        `SELECT artist_name as name, MAX(artist_url) as url, MAX(artist_bio) as bio, MAX(artist_avatar_url) as avatar_url, COUNT(*) as design_count
         FROM stickers WHERE status = 'approved' AND artist_name ILIKE $1
         GROUP BY artist_name`,
        [name]
      );
      if (result.rows.length === 0) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Artist not found' }) };
      return { statusCode: 200, headers, body: JSON.stringify(result.rows[0]) };
    } catch (err) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
    } finally {
      await client.end().catch(() => {});
    }
  }

  // POST — update avatar and/or bio
  if (event.httpMethod === 'POST') {
    try {
      const { fields, files } = await parseMultipart(event);
      const { artist_name, bio } = fields;
      if (!artist_name) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing artist_name' }) };

      let avatar_url = null;
      if (files.avatar && files.avatar.buffer.length > 0) {
        const store = getBlobStore();
        const key = `avatar/${artist_name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
        await store.set(key, files.avatar.buffer, { metadata: { mimetype: files.avatar.mimetype } });
        avatar_url = `/api/file?key=${encodeURIComponent(key)}`;
      }

      const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
      await client.connect();

      if (avatar_url) {
        await client.query(
          `UPDATE stickers SET artist_avatar_url = $1, artist_bio = COALESCE($2, artist_bio) WHERE artist_name ILIKE $3`,
          [avatar_url, bio || null, artist_name]
        );
      } else if (bio) {
        await client.query(
          `UPDATE stickers SET artist_bio = $1 WHERE artist_name ILIKE $2`,
          [bio, artist_name]
        );
      }

      await client.end();
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, avatar_url }) };
    } catch (err) {
      console.error('Artist profile error:', err.message);
      return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
    }
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
};
