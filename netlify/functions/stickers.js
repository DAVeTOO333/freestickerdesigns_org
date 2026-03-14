const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  try {
    const params = event.queryStringParameters || {};
    const limit = Math.min(parseInt(params.limit) || 12, 50);
    const offset = parseInt(params.offset) || 0;
    const tag = params.tag || null;
    const artist = params.artist || null;

    let stickers;

    if (tag) {
      stickers = await sql`
        SELECT * FROM stickers
        WHERE status = 'approved' AND ${ tag } = ANY(tags)
        ORDER BY created_at DESC
        LIMIT ${limit + 1} OFFSET ${offset}
      `;
    } else if (artist) {
      stickers = await sql`
        SELECT * FROM stickers
        WHERE status = 'approved' AND artist_name ILIKE ${artist}
        ORDER BY created_at DESC
        LIMIT ${limit + 1} OFFSET ${offset}
      `;
    } else {
      stickers = await sql`
        SELECT * FROM stickers
        WHERE status = 'approved'
        ORDER BY created_at DESC
        LIMIT ${limit + 1} OFFSET ${offset}
      `;
    }

    const has_more = stickers.length > limit;
    if (has_more) stickers.pop();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ stickers, has_more }),
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to load stickers' }),
    };
  }
};
