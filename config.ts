import { IHost } from './interface';
const { join } = require('path');

const appName = process.argv.at(-1);

export interface IConfig {
    appName: string;
    logPath: string;
    idRequestLength: number;
    socketServerPort: number;
    socketServerHost: string;
    httpServerPort: number;
    // кто будет обрабатывать http запросы
    redirectRequestTo: IHost;
    // таймаут до следующей попытки повторного подключения к сокет серверу
    clientConnectTimeout: number;

    // размер блока в котором сообщаем о размере следующуго блока
    metaBlockLength: number;

    // (для отладки) система счисления для metaBlockSize
    metaBlockRadix: number;
}

export const config: IConfig = {
    appName,
    logPath: join(__dirname, 'log', appName),
    idRequestLength: 8,
    socketServerPort: 7801,
    socketServerHost: '127.0.0.1',
    httpServerPort: 7802,
    redirectRequestTo: {
        host: '127.0.0.1',
        port: 7305, // 7203, - pgadmin
    },
    metaBlockLength: 8,
    metaBlockRadix: 10,
    clientConnectTimeout: 1000,
};
