import net from 'net';
import http from 'http';
import { URL } from 'url';
import { wait } from '../../utils';
import { log, logger } from '../logger';

interface IConnectOptions {
    port: number;
    host: string;
    timeout: number;
    maxReconnectCount: number;
    reconnectOnError: boolean;
    logEvents?: boolean;
}

export class SocketClient {
    protected _options: IConnectOptions;
    protected _client: net.Socket = null;
    protected _connected: boolean = false;
    protected _waitForConnect: boolean = false; // ждем соединения (ответа от сервера)
    protected _handlers: { [key: string]: Function } = {};

    constructor(config: IConnectOptions) {
        this.setConfig(config);
    }

    setConfig(config: IConnectOptions): void {
        this._options = { ...config };
    }

    setHandler(name: string, handler: Function): void {
        this._handlers[name] = handler;
    }

    async connect(): Promise<boolean> {
        this.disconnect();
        return this.reconnect();
    }

    isConnected(): boolean {
        return this._client && !this._client.destroyed && this._connected;
    }

    disconnect(): void {
        if (this._client) {
            this._client.destroy();
        }
        this._client = null;
        this._connected = false;
        this._waitForConnect = false;
    }

    async reconnect(): Promise<boolean> {
        const { timeout, maxReconnectCount } = this._options;
        let n = 0;
        while (n++ <= maxReconnectCount) {
            this._connect();
            await wait(timeout + 100);
            if (this.isConnected()) return true;
            this.disconnect();
        }
        return false;
    }

    protected _connect(): void {
        const { port, host, timeout } = this._options;
        const connectOptions = { port, host, timeout };
        this._waitForConnect = true;
        this._client = net.createConnection(connectOptions, (...args) =>
            this._onConnect(...args)
        );
        this._client.on('error', (err) => this._onError(err));
        this._client.on('data', (...args) => this._onData(...args));
        this._client.on('end', (...args) => this._onEnd(...args));
    }

    protected _onConnect(...args): void {
        this._log('SocketClient event connect: ', args);
        this._connected = true;
        this._waitForConnect = false;

        if (this._handlers.connect) this._handlers.connect(...args);
    }

    protected _onError(err): void {
        this._log('SocketClient event error: ', err);

        if (this._handlers.error) this._handlers.error(err);

        if (
            !this.isConnected() &&
            !this._waitForConnect &&
            this._options.reconnectOnError
        ) {
            this.reconnect();
        }
    }

    protected _onData(...args): void {
        this._log('SocketClient event data: ', args);

        if (this._handlers.data) this._handlers.data(...args);
    }

    protected _onEnd(...args): void {
        this._log('cliSocketClient event end: ', args);

        if (this._handlers.end) this._handlers.end(...args);
    }

    protected _log(...args): void {
        if (this._options.logEvents) {
            log(...args);
        }
    }
}
