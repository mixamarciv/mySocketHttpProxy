import net from 'net';
import { log, logger } from '../logger';
import { SocketServer, ISocketServerOptions } from './SocketServer';
import { config } from '../config';
import { bufferToHexStr, getUuidOnlyNumLetters } from '../utils';
import {
    TEventCloseCallback,
    TEventDataCallback,
    TEventConnectCallback,
} from '../interface';

export interface IOneWaySocketServerOptions {
    socketPort: number;
    logEvents?: boolean;
    onConnect?: TEventConnectCallback;
    onData?: TEventDataCallback;
    onClose?: TEventCloseCallback;
}

interface IQueueItem {
    key: string;
    data: Buffer;
}

const REQUEST_ID_LENGTH = config.idRequestLength;
const getUuid = getUuidOnlyNumLetters(REQUEST_ID_LENGTH);

/**
 * OneWaySocketServer
 * ждет подключение одного клиента и между ним обменивается сообщениями
 * и обменивается только по одному сообщению в одном направлении
 * т.е. если клиент отправляет сообщение то сервер ждет пока не прийдет
 * конец сообщения только и после этого отправляет ответ что сообщение получено
 * только после этого клиент или сервер могут отправлять следующее сообщение
 */
export class OneWaySocketServer {
    protected _options: IOneWaySocketServerOptions;
    protected _socketServer: SocketServer = null;
    protected _queue: IQueueItem[];

    constructor(config: IOneWaySocketServerOptions) {
        this.setConfig(config);
    }

    setConfig(config: IOneWaySocketServerOptions): void {
        this._options = { ...config };
    }

    destroy(): void {
        if (this._socketServer) {
            this._socketServer.destroy();
        }
    }

    start(): void {
        this.destroy();
        const options = this._options;
        const socketServerConfig: ISocketServerOptions = {
            socketPort: options.socketPort,
            logEvents: options.logEvents,
            onConnect: (client) => this._onConnect(client),
            onData: (data) => this._onData(data),
            onClose: () => this._onClose(),
        };
        this._socketServer = new SocketServer(socketServerConfig);
        this._socketServer.start();
    }

    disconnectClient(): void {
        this._socketServer?.disconnectClient();
    }

    sendDataToClient(data: Buffer): void {
        if (this._socketServer) {
            this._socketServer.sendDataToClient(data);
        }
        // this._queue.push();
    }

    protected _onConnect(client: net.Socket): void {
        this._log('event connect');
        if (this._options.onConnect) this._options.onConnect(client);
    }

    protected _onData(data: Buffer): void {
        this._log(
            'event data: ',
            `size: ${data.length}`
            // `buff: ${bufferToHexStr(Buffer.from(data))}`
        );
        if (this._options.onData) this._options.onData(data);
    }

    protected _onClose(err?: Error): void {
        this._log('event close');
        if (this._options.onClose) this._options.onClose(err);
    }

    protected _log(...args): void {
        if (this._options.logEvents) {
            log('OneWaySocketServer ', ...args);
        }
    }
}
