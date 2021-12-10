import net from 'net';
import { log, logger } from '../logger';
import { bufferToHexStr } from '../utils';
import {
    TAnyEventCallback,
    TEventCallback,
    TEventErrorCallback,
    TEventDataCallback,
    TEventConnectCallback,
    TEventCloseCallback,
} from '../interface';

export interface ISocketServerOptions {
    socketPort: number;
    logEvents?: boolean;
    onConnect?: TEventConnectCallback;
    onData?: TEventDataCallback;
    onClose?: TEventCloseCallback;
}

/**
 * SocketServer
 * ждет подключение одного клиента и между ним обменивается сообщениями
 */
export class SocketServer {
    protected _options: ISocketServerOptions;
    protected _socketServer: net.Server = null;
    // тут будет только один клиент и обрабатывает запросы только по одному
    protected _socketClient: net.Socket = null;

    constructor(config: ISocketServerOptions) {
        this.setConfig(config);
    }

    setConfig(config: ISocketServerOptions): void {
        this._options = { ...config };
    }

    destroy(): void {
        this.disconnectClient();
        this._socketServer.removeAllListeners();
        this._socketServer.close();
        this._socketServer = null;
    }

    start(): void {
        this._startSocketServer();
    }

    sendDataToClient(data: Buffer): void {
        if (this._socketClient) {
            this._socketClient.write(data);
        }
    }

    disconnectClient(err?: Error): void {
        if (this._socketClient) {
            this._socketClient.end();
            this._socketClient.destroy();
            this._socketClient = null;
            if (this._options.onClose) this._options.onClose(err);
        }
    }

    protected _startSocketServer(): void {
        const createSocketServer = (): net.Server => {
            const serverOptions = {
                allowHalfOpen: true,
            };

            const server: net.Server = net.createServer(
                serverOptions,
                (client: net.Socket) => {
                    this._onSocketClientConnect(client);
                    client.on('error', (err) => this._onSocketClientError(err));
                    client.on('data', (data) => this._onSocketClientData(data));
                    client.on('end', () => this._onSocketClientEnd());
                    client.on('close', () => this._onSocketClientClose());
                    client.on('timeout', () => this._onSocketClientTimeout());
                }
            );
            return server;
        };

        const { socketPort } = this._options;
        const server = createSocketServer();
        server
            .listen(socketPort, () => {
                log(`SocketServer listen port: ${socketPort} `);
            })
            .on('error', (err) => {
                logger.error(
                    `SocketServer ERROR listen port: ${socketPort} `,
                    err
                );
            });
        this._socketServer = server;
    }

    protected _onSocketClientConnect(client: net.Socket): void {
        this._logSocketClient('event connect');
        this.disconnectClient();
        this._socketClient = client;
        this._logSocketClient('new client');
        if (this._options.onConnect) this._options.onConnect(client);
    }

    protected _onSocketClientError(err: Error): void {
        this._logSocketClient('event error: ', err);
        this.disconnectClient(err);
    }

    protected _onSocketClientData(data: Buffer): void {
        this._logSocketClient(
            'event data: ',
            `size: ${data.length}`
            // `buff: ${bufferToHexStr(Buffer.from(data))}`
        );
        if (this._options.onData) this._options.onData(data);
    }

    protected _onSocketClientClose(err?: Error): void {
        this._logSocketClient('event close');
        this.disconnectClient(err);
    }

    protected _onSocketClientEnd(): void {
        this._logSocketClient('event end');
    }

    protected _onSocketClientTimeout(): void {
        // Emitted if the socket times out from inactivity. This is only to notify that the socket has been idle.
        // The user must manually close the connection.
        this._logSocketClient('event timeout');
        this.disconnectClient();
    }

    protected _logSocketClient(...args): void {
        if (this._options.logEvents) {
            const client = this._socketClient;
            let clientInfo = 'no client';
            if (client) {
                clientInfo = client.remoteAddress + ':' + client.remotePort;
            }
            log('SocketServer ', clientInfo, ...args);
        }
    }
}
