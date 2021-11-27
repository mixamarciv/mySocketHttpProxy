import net from 'net';
import http, { IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';
import { wait } from '../../utils';
import { log, logger } from '../logger';

export interface IServerOptions {
    socketPort: number;
    httpPort: number;
    logEvents?: boolean;
}

export class SocketServer {
    protected _options: IServerOptions;
    protected _socketServer: net.Server = null;
    protected _socketClient: net.Socket = null;
    protected _httpServer: http.Server = null;
    protected _handlers: { [key: string]: Function } = {};

    constructor(config: IServerOptions) {
        this.setConfig(config);
    }

    setConfig(config: IServerOptions): void {
        this._options = { ...config };
    }

    setHandler(name: string, handler: Function): void {
        this._handlers[name] = handler;
    }

    start(): void {
        this._startSocketServer();
        this._startHttpServer();
    }

    protected _startHttpServer(): void {
        const { httpPort } = this._options;
        this._httpServer = http.createServer((req, res) => {
            this._onHttpRequest(req, res);
        });
        this._httpServer
            .listen(httpPort, () => {
                log(`httpServer listen port: ${httpPort} `);
            })
            .on('error', (err) => {
                logger.error(`httpServer ERROR listen port: ${httpPort} `, err);
            });
    }

    protected _onHttpRequest(req: IncomingMessage, res: ServerResponse): void {
        this._logHttpServer(req, res, 'request');
        res.end('okay');
        this._socketClient.write(req.url);
    }

    protected _startSocketServer(): void {
        const { socketPort } = this._options;
        this._socketServer = net.createServer((client: net.Socket) => {
            this._socketClient = client;
            this._onSocketClientConnect(client);
            client.on('data', (data) => this._onSocketClientData(client, data));
            client.on('end', () => this._onSocketClientEnd(client));
            client.on('error', (err) => this._onSocketClientError(client, err));
        });

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
        this._logSocketClient(client, 'socketClient event connect');
        if (this._handlers.connect) this._handlers.connect(client);
    }

    protected _onSocketClientError(client: net.Socket, err): void {
        this._logSocketClient(client, 'socketClient event error: ', err);
        if (this._handlers.error) this._handlers.error(client, err);
    }

    protected _onSocketClientData(client: net.Socket, data): void {
        this._logSocketClient(client, 'socketClient event data: ', data);
        if (this._handlers.data) this._handlers.data(client, data);
    }

    protected _onSocketClientEnd(client: net.Socket): void {
        this._logSocketClient(client, 'socketClient event end');
        if (this._handlers.end) this._handlers.end(client);
    }

    protected _logSocketClient(client: net.Socket, ...args): void {
        if (this._options.logEvents) {
            const clientInfo = client.remoteAddress + ':' + client.remotePort;
            log(clientInfo, ...args);
        }
    }

    protected _logHttpServer(
        req: IncomingMessage,
        res: ServerResponse,
        ...args
    ): void {
        if (this._options.logEvents) {
            const reqInfo = req.url;
            log(reqInfo, ...args);
        }
    }
}
