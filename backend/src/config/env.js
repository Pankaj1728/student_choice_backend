require('dotenv').config();
const required = ['DB_NAME', 'DB_USER', 'JWT_SECRET'];
for (const key of required) if (!process.env[key]) throw new Error(`Missing required environment variable: ${key}`);
module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development', port: Number(process.env.PORT || 5000),
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  jwtSecret: process.env.JWT_SECRET, jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  db: { host: process.env.DB_HOST || '127.0.0.1', port: Number(process.env.DB_PORT || 3306), database: process.env.DB_NAME, user: process.env.DB_USER, password: process.env.DB_PASSWORD || '' }
};
