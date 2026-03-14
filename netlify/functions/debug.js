exports.handler = async (event) => {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      has_database_url: !!process.env.DATABASE_URL,
      database_url_length: process.env.DATABASE_URL ? process.env.DATABASE_URL.length : 0,
      database_url_start: process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 20) : 'NOT SET',
      node_version: process.version,
      all_env_keys: Object.keys(process.env).filter(k => !k.includes('SECRET') && !k.includes('KEY') && !k.includes('TOKEN') && !k.includes('PASSWORD'))
    })
  };
};
