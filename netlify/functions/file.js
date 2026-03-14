const { getStore } = require('@netlify/blobs');

exports.handler = async (event) => {
  const key = (event.queryStringParameters || {}).key;
  if (!key) return { statusCode: 400, body: 'Missing key' };

  try {
    const store = getStore('sticker-files');
    const { data, metadata } = await store.getWithMetadata(key, { type: 'arrayBuffer' });
    if (!data) return { statusCode: 404, body: 'Not found' };

    const mimetype = (metadata && metadata.mimetype) || 'application/octet-stream';
    const filename = (metadata && metadata.filename) || 'sticker';
    const isDownload = key.startsWith('print/');

    return {
      statusCode: 200,
      headers: {
        'Content-Type': mimetype,
        'Cache-Control': 'public, max-age=31536000',
        ...(isDownload ? { 'Content-Disposition': `attachment; filename="${filename}"` } : {})
      },
      body: Buffer.from(data).toString('base64'),
      isBase64Encoded: true
    };
  } catch (err) {
    console.error('File serve error:', err.message);
    return { statusCode: 500, body: 'Error serving file' };
  }
};
