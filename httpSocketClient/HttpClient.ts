import net from 'net';
import http from 'http';
import { IHost } from '../config';
import { URL } from 'url';
import { wait } from '../../utils';
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

    protected stopWorker(id: string): void {
        this._reqWorkers.delete(id);
    }

    protected _onData(data: string): void {
        this._log('event data', data);

        const id = data.substr(0, REQUEST_ID_LENGTH);
        const url = data.substr(REQUEST_ID_LENGTH);

        const stopWorker = () => {
            this._sendData(`${id}/${id}`);
            this.stopWorker(id);
        };

        const params: IHttpRequestWorkerOptions = {
            logEvents: true,
            id,
            url,
            onData: (data1) => {
                // отправляем данные
                this._sendData(`${id}${data1}`);
            },
            onEnd: (data1) => {
                // отправляем информацию о том что это конец данных
                if (data1) this._sendData(`${id}${data1}`);
                stopWorker();
            },
            onError: stopWorker,
            onClose: stopWorker,
        };

        const worker = new HttpRequestWorker(params);
        this._reqWorkers.set(id, worker);
        worker.sendRequest();
    }

    protected _sendData(data: string): void {
        this._socketClient.sendData(data);
    }

    protected _log(...args): void {
        if (this._options.logEvents) {
            log('HttpClient', ...args);
        }
    }
}

interface IHttpRequestWorkerOptions {
    logEvents?: boolean;
    id: string;
    url: string;
    onData?: (data1: string) => void;
    onEnd?: (data1: string) => void;
    onClose?: () => void;
    onError?: (err: Error) => void;
}

class HttpRequestWorker {
    protected _options: IHttpRequestWorkerOptions;
    protected _request: http.ClientRequest;
    protected _handlers: { [key: string]: Function } = {};

    constructor(config: IHttpRequestWorkerOptions) {
        this.setConfig(config);
    }

    setConfig(config: IHttpRequestWorkerOptions): void {
        this._options = { ...config };
        if (config.onData) this.setHandler('data', config.onData);
        if (config.onEnd) this.setHandler('end', config.onEnd);
        if (config.onClose) this.setHandler('close', config.onClose);
        if (config.onError) this.setHandler('error', config.onError);
    }

    setHandler(name: string, handler: Function): void {
        this._handlers[name] = handler;
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
            res.setEncoding('utf8');
            res.on('data', (chunk) => this._onData(chunk));
            res.on('end', () => this._onEnd());
            // res.on('close', () => this._onClose());
            res.on('error', (e) => this._onError(e));
        });

        this._request.on('error', (e) => this._onError(e));
        this._request.on('close', () => this._onClose());
        this._request.end();
    }

    protected _onError(err): void {
        this._log('event error: ', err);

        if (this._handlers.error) this._handlers.error(err);
    }

    protected _onData(data: string): void {
        this._log('event data: ', data);

        if (this._handlers.data) this._handlers.data(data);
    }

    protected _onEnd(data?: string): void {
        this._log('event end: ', data);

        if (this._handlers.end) this._handlers.end(data);
    }

    protected _onClose(): void {
        this._log('event close');

        if (this._handlers.close) this._handlers.close();
    }

    protected _log(...args): void {
        if (this._options.logEvents) {
            log('HttpRequestWorker', ...args);
        }
    }
}
