import { app } from './app';
import { env } from './config/env';
import { logger } from './utils/logger';

const port = parseInt(env.PORT, 10) || 3000;

app.listen(port, () => {
  logger.info(`Server listening on port ${port}`);
});
