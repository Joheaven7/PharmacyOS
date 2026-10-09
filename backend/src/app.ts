import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { config } from './config';
import { requestContextMiddleware } from './middleware/requestContext';
import { errorHandler } from './middleware/errorHandler';
import routes from './routes';

export const createApp = (): Express => {
  const app = express();

  // Basic security headers
  app.use(helmet());

  // CORS Configuration
  app.use(
    cors({
      origin: config.corsOrigin,
      credentials: true,
    })
  );

  // Cookie parser for secure HttpOnly session cookies
  app.use(cookieParser());

  // Body Parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Request Context Middleware (assigns requestId, userId, organizationId framework)
  app.use(requestContextMiddleware);

  // Mount Application Routes
  app.use(routes);

  // Global Error Handler
  app.use(errorHandler);

  return app;
};
