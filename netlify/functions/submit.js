const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const body = JSON.parse(event.body);
    const { title, artist_name, artist_url, description, tags, file_url, thumbnail_url } = body;

    if (!title || !artist_name || !file_url || !thumbnail_url) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields' }),
      };
    }

    // Basic URL validation
    try {
      new URL(file_url);
      new URL(thumbnail_url);
    } catch {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid file or thumbnail URL' }),
      };
    }

    await sql`
      INSERT INTO stickers (title, artist_name, artist_url, description, tags, download_url, thumbnail_url, status)
      VALUES (
        ${title.substring(0, 200)},
        ${artist_name.substring(0, 100)},
        ${artist_url || null},
        ${description ? description.substring(0, 1000) : null},
        ${tags || []},
        ${file_url},
        ${thumbnail_url},
        'pending'
      )
    `;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true }),
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Submission failed. Please try again.' }),
    };
  }
};
