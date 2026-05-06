export default () => ({
    port: parseInt(process.env.PORT ?? '3001', 10) || 3001,
    nodeEnv: process.env.NODE_ENV || 'development',
    jwt: {
        secret: process.env.JWT_SECRET,
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
    },
    database: {
        url: process.env.DATABASE_URL,
    },
    supabase: {
        url: process.env.SUPABASE_URL,
        anonKey: process.env.SUPABASE_ANON_KEY,
        serviceKey: process.env.SUPABASE_SERVICE_KEY,
    },
    ef2: {
        apiUrl: process.env.EF2_API_URL || 'https://sandbox.ef2.do/v1',
        defaultEnv: process.env.EF2_DEFAULT_ENV || 'sandbox',
    },
    frontend: {
        url: process.env.FRONTEND_URL || 'http://localhost:3000',
        corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(','),
    },
});