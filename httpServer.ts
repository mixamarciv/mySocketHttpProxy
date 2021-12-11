import { logger, log } from './logger';
import { config } from './config';
import { OneWayTransfer, IOneWayTransferOptions } from './common';
import {
    SocketServer,
    ISocketServerOptions,
    HttpServer,
    IHttpServerOptions,
} from './httpSocketServer';

const LISTEN_SOCKET_PORT = config.socketServerPort;
const LISTEN_HTTP_PORT = config.httpServerPort;

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
        },
    };

    const httpServerConfig: IHttpServerOptions = {
        logEvents: false,
        httpPort: LISTEN_HTTP_PORT,
        onRequest: (data: Buffer) => {
            oneWayTransfer.sendData(data);
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
