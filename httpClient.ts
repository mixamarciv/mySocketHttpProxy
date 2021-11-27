import net from 'net';
import http from 'http';
import { URL } from 'url';
import { logUtils, wait } from '../utils';
import { logger, log } from './logger';
import { SocketClient } from './httpSocketClient';

const SERVER_SOCKET_PORT = Number(process.env.SERVER_SOCKET_PORT);
const SERVER_SOCKET_HOST = process.env.SERVER_SOCKET_HOST;
const REDIRECT_REQUEST_TO = process.env.REDIRECT_REQUEST_TO;

startSocketClient({
    socketPort: SERVER_SOCKET_PORT,
    socketHost: SERVER_SOCKET_HOST,
    connectTimeout: 1000,
});

interface IStartSocketProxy {
    socketPort: number;
    socketHost: string;
    connectTimeout: number;
}

async function startSocketClient(config: IStartSocketProxy) {
    const connectOptions = {
        port: config.socketPort,
        host: config.socketHost,
        timeout: config.connectTimeout,
        maxReconnectCount: 5000,
        reconnectOnError: true,
        logEvents: true,
    };

    const client = new SocketClient(connectOptions);

    client.setHandler('data', (args) => {
        log('socket data: ', args);
    });

    await client.connect();
}
