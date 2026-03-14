const { Client } = require('pg');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();
    const result = await client.query(
      `SELECT artist_name as name, MAX(artist_url) as url, COUNT(*) as design_count
       FROM stickers WHERE status = 'approved'
       GROUP BY artist_name ORDER BY design_count DESC, artist_name ASC`
    );

    return { statusCode: 200, headers, body: JSON.stringify({ artists: result.rows }) };
  } catch (err) {
    console.error('Artists error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to load artists' }) };
  } finally {
    await client.end().catch(() => {});
  }
};
