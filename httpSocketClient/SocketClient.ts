import net from 'net';
import http from 'http';
import { URL } from 'url';
import { wait, bufferToHexStr } from '../utils';
import { log, logger } from '../logger';
import {
    TAnyEventCallback,
    TEventCallback,
    TEventErrorCallback,
    TEventDataCallback,
} from '../interface';

export interface ISocketClientOptions {
    port: number;
    host: string;
    timeout: number;
    maxReconnectCount: number;
    reconnectOnError: boolean;
    logEvents?: boolean;
    onConnect?: TEventCallback;
    onData?: TEventDataCallback;
    onEnd?: TEventCallback;
    onClose?: TEventCallback;
    onError?: TEventErrorCallback;
}

export class SocketClient {
    protected _options: ISocketClientOptions;
    protected _client: net.Socket = null;
    protected _connected: boolean = false;
    protected _waitForConnect: boolean = false; // ждем соединения (ответа от сервера)

    constructor(config: ISocketClientOptions) {
        this.setConfig(config);
    }

    setConfig(config: ISocketClientOptions): void {
        this._options = { ...config };
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

    sendData(data: Buffer): void {
        this._log(
            'sendData: ',
            this.isConnected(),
            `size: ${data.length}`
            // `buff: ${bufferToHexStr(Buffer.from(data))}`
            // data
        );
        if (this.isConnected()) {
            this._client.write(data);
        }
    }

    protected _connect(): void {
        const { port, host, timeout } = this._options;
        const connectOptions = { port, host, timeout };
        this._waitForConnect = true;
        this._client = net.createConnection(connectOptions, (...args) =>
            this._onConnect(...args)
        );
        this._client.on('error', (err) => this._onError(err));
        this._client.on('data', (data) => this._onData(data));
        this._client.on('end', () => this._onEnd());
        this._client.on('close', () => this._onClose());
        this._client.on('timeout', () => this._onTimeout());
    }

    protected _onConnect(): void {
        this._log('event connect');
        this._connected = true;
        this._waitForConnect = false;

        if (this._options.onConnect) this._options.onConnect();
    }

    protected _onError(err): void {
        this._log('event error: ', err);

        if (this._options.onError) this._options.onError(err);

        if (
            !this.isConnected() &&
            !this._waitForConnect &&
            this._options.reconnectOnError
        ) {
            this.reconnect();
        }
    }

    protected _onData(data: Buffer): void {
        this._log('event data: ', data);

        if (this._options.onData) this._options.onData(data);
    }

    protected _onEnd(): void {
        this._log('event end');

        if (this._options.onEnd) this._options.onEnd();
    }

    protected _onClose(): void {
        this._log('event close');

        if (this._options.onClose) this._options.onClose();
    }

    protected _onTimeout(): void {
        this._log('event timeout');
    }

    protected _log(...args): void {
        if (this._options.logEvents) {
            log('SocketClient', ...args);
        }
    }
}
