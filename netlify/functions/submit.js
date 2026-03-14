const { Client } = require('pg');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const dbUrl = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
  if (!dbUrl) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'No database URL found' }) };
  }

  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

  try {
    const body = JSON.parse(event.body);
    const { title, artist_name, artist_url, description, tags, file_url, thumbnail_url } = body;

    if (!title || !artist_name || !file_url || !thumbnail_url) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing required fields' }) };
    }

    try { new URL(file_url); new URL(thumbnail_url); } catch {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid file or thumbnail URL' }) };
    }

    await client.connect();
    await client.query(
      `INSERT INTO stickers (title, artist_name, artist_url, description, tags, download_url, thumbnail_url, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')`,
      [
        title.substring(0, 200),
        artist_name.substring(0, 100),
        artist_url || null,
        description ? description.substring(0, 1000) : null,
        tags || [],
        file_url,
        thumbnail_url
      ]
    );

    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
  } catch (err) {
    console.error('Submit error:', err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  } finally {
    await client.end().catch(() => {});
  }
};
