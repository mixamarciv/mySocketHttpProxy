const { join } = require('path');
require('dotenv').config({ path: join(__dirname, 'config.env') });

const appName = process.argv.at(-1);

export interface IHost {
    host: string;
    port: number;
}

export interface IConfig {
    appName: string;
    logPath: string;
    idRequestLength: number;
    socketServerPort: number;
    socketServerHost: string;
    // кто будет обрабатывать http запросы
    redirectRequestTo: IHost;
    // таймаут до следующей попытки повторного подключения к сокет серверу
    clientConnectTimeout: number;
}

export const config: IConfig = {
    appName,
    logPath: join(__dirname, 'log', appName),
    idRequestLength: 16,
    socketServerPort: Number(process.env.SERVER_SOCKET_PORT),
    socketServerHost: process.env.SERVER_SOCKET_HOST,
    redirectRequestTo: {
        host: '127.0.0.1',
        port: 7305,
    },
    clientConnectTimeout: 1000,
};
