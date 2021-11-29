import net from 'net';
import { log, logger } from '../logger';

export interface ISocketServerOptions {
    socketPort: number;
    logEvents?: boolean;
}

export class SocketServer {
    protected _options: ISocketServerOptions;
    protected _socketServer: net.Server = null;
    // тут будет только один клиент и пока только он обрабатывает все запросы
    protected _socketClient: net.Socket = null;
    protected _handlers: { [key: string]: Function } = {};

    constructor(config: ISocketServerOptions) {
        this.setConfig(config);
    }

    setConfig(config: ISocketServerOptions): void {
        this._options = { ...config };
    }

    setHandler(name: string, handler: Function): void {
        this._handlers[name] = handler;
    }

    start(): void {
        this._startSocketServer();
    }

    sendDataToClient(data: string): void {
        if (this._socketClient) {
            this._socketClient.write(data);
        }
    }

    disconnect(): void {
        if (this._socketClient) {
            this._socketClient.end();
            this._socketClient.destroy();
            this._socketClient = null;
        }
    }

    protected _startSocketServer(): void {
        const { socketPort } = this._options;
        const serverOptions = {
            allowHalfOpen: true,
        };

        this._socketServer = net.createServer(
            serverOptions,
            (client: net.Socket) => {
                this._onSocketClientConnect(client);
                client.on('data', (data) =>
                    this._onSocketClientData(client, data)
                );
                client.on('end', () => this._onSocketClientEnd(client));
                client.on('error', (err) =>
                    this._onSocketClientError(client, err)
                );
            }
        );

        this._socketServer
            .listen(socketPort, () => {
                log(`SocketServer listen port: ${socketPort} `);
            })
            .on('error', (err) => {
                logger.error(
                    `SocketServer ERROR listen port: ${socketPort} `,
                    err
                );
            });
    }

    protected _onSocketClientConnect(client: net.Socket): void {
        this._logSocketClient(client, 'event connect');

        this.disconnect();
        this._socketClient = client;
        if (this._handlers.connect) this._handlers.connect(client);
    }

    protected _onSocketClientError(client: net.Socket, err): void {
        this._logSocketClient(client, 'event error: ', err);
        if (this._handlers.error) this._handlers.error(client, err);
    }

    protected _onSocketClientData(client: net.Socket, data): void {
        this._logSocketClient(client, 'event data: ', data);
        if (this._handlers.data) this._handlers.data(client, data);
    }

    protected _onSocketClientEnd(client: net.Socket): void {
        this._logSocketClient(client, 'event end');
        if (this._handlers.end) this._handlers.end(client);
    }

    protected _logSocketClient(client: net.Socket, ...args): void {
        if (this._options.logEvents) {
            const clientInfo = client.remoteAddress + ':' + client.remotePort;
            log('SocketServer ', clientInfo, ...args);
        }
    }
}
