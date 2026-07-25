import express, { Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { config } from './config';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import routes from './routes';

export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(
    cors({
      origin: config.corsOrigin,
      methods: ['GET', 'POST'],
    })
  );
  app.use(express.json({ limit: '100kb' }));
  app.use(requestLogger);

  app.use(routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
