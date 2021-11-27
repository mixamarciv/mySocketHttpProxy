import { logger, log } from './logger';
import {
    SocketServer,
    ISocketServerOptions,
    HttpServer,
    IHttpServerOptions,
} from './httpSocketServer';

import net from 'net';
import http from 'http';
import { URL } from 'url';

const LISTEN_SOCKET_PORT = Number(process.env.SERVER_SOCKET_PORT);
const LISTEN_HTTP_PORT = Number(process.env.SERVER_HTTP_PORT);

startSocketProxy();

function startSocketProxy() {
    const socketServerConfig: ISocketServerOptions = {
        logEvents: true,
        socketPort: LISTEN_SOCKET_PORT,
    };

    const socketServer = new SocketServer(socketServerConfig);
    socketServer.start();

    const httpServerConfig: IHttpServerOptions = {
        logEvents: true,
        httpPort: LISTEN_HTTP_PORT,
        socketServer,
    };

    const httpServer = new HttpServer(httpServerConfig);
    httpServer.start();
}
