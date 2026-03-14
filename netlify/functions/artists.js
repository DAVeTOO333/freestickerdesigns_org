const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  try {
    const artists = await sql`
      SELECT 
        artist_name as name,
        MAX(artist_url) as url,
        COUNT(*) as design_count
      FROM stickers
      WHERE status = 'approved'
      GROUP BY artist_name
      ORDER BY design_count DESC, artist_name ASC
    `;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ artists }),
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to load artists' }),
    };
  }
};
