import net from 'net';
import http from 'http';
import { IHost } from '../config';
import { URL } from 'url';
import { wait, bufferToHexStr } from '../utils';
import { log, logger } from '../logger';
import { SocketClient } from './SocketClient';
import { config } from '../config';

const REQUEST_ID_LENGTH = config.idRequestLength;
const REQUEST_FROM = config.redirectRequestTo;

export interface IHttpClientOptions {
    sendRequestTo: IHost;
    socketClient: SocketClient;
    logEvents?: boolean;
}

interface IRequestInfo {
    id: string;
    url: string;
    response: http.ServerResponse;
}

export class HttpClient {
    protected _options: IHttpClientOptions;
    protected _socketClient: SocketClient;
    protected _reqWorkers: Map<string, HttpRequestWorker>;

    constructor(config: IHttpClientOptions) {
        this._reqWorkers = new Map();
        this.setConfig(config);
    }

    setConfig(config: IHttpClientOptions): void {
        this._options = { ...config };
        this._socketClient = config.socketClient;
        this._socketClient.setHandler('data', (data: Buffer) => {
            this._onData(data.toString());
        });
    }

    protected _onData(data: string): void {
        this._log('event data', data);

        const id = data.substr(0, REQUEST_ID_LENGTH);
        const idBuff = Buffer.from(id);
        const url = data.substr(REQUEST_ID_LENGTH);
        let isStopped = false;

        const stopWorker = () => {
            if (!isStopped) {
                isStopped = true;
                this._sendData(Buffer.from(`${id}/${id}`));
                this._stopWorker(id);
            }
        };

        const params: IHttpRequestWorkerOptions = {
            logEvents: this._options.logEvents,
            id,
            url,
            onData: (data1) => {
                // отправляем данные
                const dataBuff = Buffer.concat([idBuff, data1]);
                this._sendData(dataBuff);
            },
            onEnd: stopWorker,
            onError: stopWorker,
            onClose: stopWorker,
        };

        const worker = new HttpRequestWorker(params);
        this._reqWorkers.set(id, worker);
        worker.sendRequest();
    }

    protected _stopWorker(id: string): void {
        this._reqWorkers.delete(id);
    }

    protected _sendData(data: Buffer): void {
        this._socketClient.sendData(data);
    }

    protected _log(...args): void {
        if (this._options.logEvents) {
            log('HttpClient', ...args);
        }
    }
}

type TEventCallback = () => void;
type TEventDataCallback = (buf: Buffer) => void;
type TEventErrorCallback = (err: Error) => void;
type TEventsCallback =
    | TEventCallback
    | TEventDataCallback
    | TEventErrorCallback;

interface IHttpRequestWorkerOptions {
    logEvents?: boolean;
    id: string;
    url: string;
    onData?: TEventDataCallback;
    onEnd?: TEventCallback;
    onClose?: TEventCallback;
    onError?: TEventErrorCallback;
}

class HttpRequestWorker {
    protected _options: IHttpRequestWorkerOptions;
    protected _request: http.ClientRequest;

    constructor(config: IHttpRequestWorkerOptions) {
        this.setConfig(config);
    }

    setConfig(config: IHttpRequestWorkerOptions): void {
        this._options = { ...config };
    }

    protected _getUrl(): string {
        let url = this._options.url;
        if (!url || /^\//.test(url)) {
            url = 'http://anyhost.hz' + url;
        }

        const urlBuilder = new URL(url);
        urlBuilder.hostname = REQUEST_FROM.host;
        urlBuilder.port = String(REQUEST_FROM.port);

        return urlBuilder.toString();
    }

    sendRequest(): void {
        const url = this._getUrl();

        this._request = http.request(url, (res) => {
            // res.setEncoding('utf8');  - из-за этой строчки бьются бинарные данные
            res.on('data', (chunk) => this._onData(chunk));
            res.on('end', () => this._onEnd());
            res.on('close', () => this._onClose());
            res.on('error', (e) => this._onError(e));
        });

        this._request.on('error', (e) => this._onError(e));
        this._request.on('close', () => this._onClose());
        this._request.end();
    }

    protected _onError(err): void {
        this._log('event error: ', err);

        if (this._options.onError) this._options.onError(err);
    }

    protected _onData(data: Buffer): void {
        this._log(
            'event data: ',
            'size:',
            data.length
            // bufferToHexStr(Buffer.from(data))
        );
        let dataBuff = data;
        if (!Buffer.isBuffer(data)) dataBuff = Buffer.from(data);

        if (this._options.onData) this._options.onData(dataBuff);
    }

    protected _onEnd(): void {
        this._log('event end');

        if (this._options.onEnd) this._options.onEnd();
    }

    protected _onClose(): void {
        this._log('event close');

        if (this._options.onClose) this._options.onClose();
    }

    protected _log(...args): void {
        if (this._options.logEvents) {
            log('HttpRequestWorker', ...args);
        }
    }
}
