import config from './config';
import loaders from './loaders';
import { logger } from './utils/logger';
import { wss } from './websocket/server';
import { parse } from 'url';

const startServer = async () => {
  try {
    const app = await loaders();

    const server = app.listen(config.PORT, () => {
      // Server started
    });

    // Handle WebSocket upgrades
    server.on('upgrade', (request, socket, head) => {
      const { pathname } = parse(request.url || '', true);

      if (pathname === '/ws' || pathname === '/') {
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit('connection', ws, request);
        });
      } else {
        socket.destroy();
      }
    });

  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
};

void startServer();


