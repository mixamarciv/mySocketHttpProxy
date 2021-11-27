import net from 'net';
import http from 'http';
import { URL } from 'url';
import { logUtils, wait } from '../utils';
import { logger, log } from './logger';
import { config } from './config';
import {
    SocketClient,
    ISocketClientOptions,
    HttpClient,
    IHttpClientOptions,
} from './httpSocketClient';

startSocketClient();

async function startSocketClient() {
    const connectOptions: ISocketClientOptions = {
        port: config.socketServerPort,
        host: config.socketServerHost,
        timeout: config.clientConnectTimeout,
        maxReconnectCount: 5000,
        reconnectOnError: true,
        logEvents: true,
    };

    const socketClient = new SocketClient(connectOptions);
    const httpClientOptions: IHttpClientOptions = {
        socketClient,
        sendRequestTo: config.redirectRequestTo,
        logEvents: true,
    };
    const httpClient = new HttpClient(httpClientOptions);

    socketClient.connect();
}
