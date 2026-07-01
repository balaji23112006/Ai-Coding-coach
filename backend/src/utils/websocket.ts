import { IncomingMessage } from 'http';
import { Socket } from 'net';
import crypto from 'crypto';
import { logger } from './logger.js';

const clients = new Set<Socket>();

export function registerWebSocketServer(server: any) {
  server.on('upgrade', (req: IncomingMessage, socket: Socket, head: Buffer) => {
    const key = req.headers['sec-websocket-key'];
    if (!key) {
      socket.destroy();
      return;
    }
    const hash = crypto
      .createHash('sha1')
      .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
      .digest('base64');

    socket.write(
      'HTTP/1.1 101 Switching Protocols\r\n' +
        'Upgrade: websocket\r\n' +
        'Connection: Upgrade\r\n' +
        `Sec-WebSocket-Accept: ${hash}\r\n\r\n`,
    );

    clients.add(socket);
    logger.info(`[WS] Client connected. Total clients: ${clients.size}`);

    socket.on('close', () => {
      clients.delete(socket);
      logger.info(`[WS] Client disconnected. Total clients: ${clients.size}`);
    });

    socket.on('error', (err: any) => {
      clients.delete(socket);
      if (err.code === 'ECONNRESET' || err.code === 'ECONNABORTED' || err.code === 'EPIPE') {
        logger.info(
          `[WS] Socket connection reset/aborted (${err.code}). Total clients: ${clients.size}`,
        );
      } else {
        logger.error('[WS] Socket error:', err);
      }
    });
  });
}

export function broadcastWS(message: any) {
  const json = JSON.stringify(message);
  const buf = Buffer.from(json);
  const len = buf.length;
  let header: Buffer;

  if (len <= 125) {
    header = Buffer.from([0x81, len]);
  } else if (len <= 65535) {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(len), 2);
  }

  const frame = Buffer.concat([header, buf]);
  for (const client of clients) {
    try {
      client.write(frame);
    } catch {
      clients.delete(client);
    }
  }
}
