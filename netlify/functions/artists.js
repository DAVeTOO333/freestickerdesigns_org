const { Client } = require('pg');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  if (!process.env.DATABASE_URL) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'DATABASE_URL not set' }) };
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    const result = await client.query(
      `SELECT artist_name as name, MAX(artist_url) as url, COUNT(*) as design_count
       FROM stickers WHERE status = 'approved'
       GROUP BY artist_name ORDER BY design_count DESC, artist_name ASC`
    );

    return { statusCode: 200, headers, body: JSON.stringify({ artists: result.rows }) };
  } catch (err) {
    console.error('Artists error:', err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  } finally {
    await client.end().catch(() => {});
  }
};
