import cors from 'cors';

const corsOptions: cors.CorsOptions = {
  origin: [
    'http://localhost:5173',
    process.env.CLIENT_ORIGIN || '',
  ].filter(Boolean),
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
};

export const corsMiddleware = cors(corsOptions);
