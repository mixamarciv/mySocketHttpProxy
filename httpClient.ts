import { logger, log } from './logger';
import { config } from './config';
import { OneWayTransfer, IOneWayTransferOptions } from './common';
import {
    SocketClient,
    ISocketClientOptions,
    HttpClient,
    IHttpClientOptions,
} from './httpSocketClient';

startSocketClient();

async function startSocketClient() {
    let socketClient: SocketClient = null;
    let httpClient: HttpClient = null;
    let oneWayTransfer: OneWayTransfer = null;

    const socketClientOptions: ISocketClientOptions = {
        logEvents: false,
        port: config.socketServerPort,
        host: config.socketServerHost,
        timeout: config.clientConnectTimeout,
        maxReconnectCount: 5000,
        reconnectOnError: true,
        onData: (data: Buffer) => {
            oneWayTransfer.onData(data);
        },
    };

    const httpClientOptions: IHttpClientOptions = {
        logEvents: false,
        sendRequestTo: config.redirectRequestTo,
        onData: (data: Buffer) => {
            oneWayTransfer.sendData(data);
        },
    };

    const oneWayTransferOptions: IOneWayTransferOptions = {
        logEvents: true,
        onData: (data: Buffer) => {
            httpClient.setNewRequestData(data);
        },
        sendData: (data: Buffer) => {
            socketClient.sendData(data);
        },
    };

    socketClient = new SocketClient(socketClientOptions);
    httpClient = new HttpClient(httpClientOptions);
    oneWayTransfer = new OneWayTransfer(oneWayTransferOptions);

    socketClient.connect();
}
