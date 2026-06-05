import express from 'express';
import { corsMiddleware } from './middleware/cors.js';
import { errorHandler } from './middleware/errorHandler.js';
import { apiRouter } from './routes/index.js';
import { initAdapters } from './adapters/adapterFactory.js';

initAdapters();

const app = express();

app.use(corsMiddleware);
app.use(express.json());
app.use('/api', apiRouter);
app.use(errorHandler);

export { app };
