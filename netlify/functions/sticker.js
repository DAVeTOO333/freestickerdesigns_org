const { Client } = require('pg');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  const dbUrl = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
  if (!dbUrl) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'No database URL found' }) };
  }

  const id = (event.queryStringParameters || {}).id;
  if (!id) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing id' }) };
  }

  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();
    const result = await client.query(
      `SELECT * FROM stickers WHERE id = $1 AND status = 'approved'`,
      [parseInt(id)]
    );

    if (result.rows.length === 0) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Not found' }) };
    }

    return { statusCode: 200, headers, body: JSON.stringify(result.rows[0]) };
  } catch (err) {
    console.error('Sticker error:', err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  } finally {
    await client.end().catch(() => {});
  }
};
