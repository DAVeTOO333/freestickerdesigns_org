const { Client } = require('pg');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

  try {
    const params = event.queryStringParameters || {};
    const limit = Math.min(parseInt(params.limit) || 12, 50);
    const offset = parseInt(params.offset) || 0;
    const tag = params.tag || null;
    const artist = params.artist || null;

    await client.connect();

    let result;
    if (tag) {
      result = await client.query(
        `SELECT * FROM stickers WHERE status = 'approved' AND $1 = ANY(tags) ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
        [tag, limit + 1, offset]
      );
    } else if (artist) {
      result = await client.query(
        `SELECT * FROM stickers WHERE status = 'approved' AND artist_name ILIKE $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
        [artist, limit + 1, offset]
      );
    } else {
      result = await client.query(
        `SELECT * FROM stickers WHERE status = 'approved' ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
        [limit + 1, offset]
      );
    }

    const stickers = result.rows;
    const has_more = stickers.length > limit;
    if (has_more) stickers.pop();

    return { statusCode: 200, headers, body: JSON.stringify({ stickers, has_more }) };
  } catch (err) {
    console.error('Stickers error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to load stickers' }) };
  } finally {
    await client.end().catch(() => {});
  }
};
