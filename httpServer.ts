import { logger, log } from './logger';
import { OneWayTransfer, IOneWayTransferOptions } from './common';
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
    let socketServer: SocketServer = null;
    let httpServer: HttpServer = null;
    let oneWayTransfer: OneWayTransfer = null;

    const socketServerConfig: ISocketServerOptions = {
        logEvents: false,
        socketPort: LISTEN_SOCKET_PORT,
        onData: (data) => {
            oneWayTransfer.onData(data);
            oneWayTransfer.onEndData();
        },
    };

    const httpServerConfig: IHttpServerOptions = {
        logEvents: false,
        httpPort: LISTEN_HTTP_PORT,
        onRequest: (data: Buffer) => {
            oneWayTransfer.sendData(data);
            oneWayTransfer.sendEndData();
        },
    };

    const oneWayTransferOptions: IOneWayTransferOptions = {
        logEvents: true,
        onData: (data: Buffer) => {
            httpServer.onGetDataFromClient(data);
        },
        sendData: (data: Buffer) => {
            socketServer.sendDataToClient(data);
        },
    };

    socketServer = new SocketServer(socketServerConfig);
    httpServer = new HttpServer(httpServerConfig);
    oneWayTransfer = new OneWayTransfer(oneWayTransferOptions);

    socketServer.start();
    httpServer.start();
}
