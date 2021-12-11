import http, { IncomingMessage } from 'http';
import { URL } from 'url';
import { log } from '../logger';
import { config } from '../config';
import {
    TEventCallback,
    TEventErrorCallback,
    TEventDataCallback,
    TEventResponseCallback,
    IRequestData,
} from '../interface';

const REQUEST_FROM = config.redirectRequestTo;

export interface IHttpRequestWorkerOptions {
    logEvents?: boolean;
    requestData: IRequestData;
    onResponse?: TEventResponseCallback;
    onData?: TEventDataCallback;
    onEnd?: TEventCallback;
    onClose?: TEventCallback;
    onError?: TEventErrorCallback;
}

export class HttpRequestWorker {
    protected _options: IHttpRequestWorkerOptions;
    protected _request: http.ClientRequest;

    constructor(config: IHttpRequestWorkerOptions) {
        this.setConfig(config);
    }

    setConfig(config: IHttpRequestWorkerOptions): void {
        this._options = { ...config };
    }

    protected _getUrl(): string {
        let url = this._options.requestData.url;
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

        const reqData = this._options.requestData;
        const options = {
            method: reqData.method,
            headers: reqData.headers,
        };

        this._request = http.request(url, options, (res: IncomingMessage) => {
            // res.setEncoding('utf8');  - из-за этой строчки бьются бинарные данные
            if (this._options.onResponse) this._options.onResponse(res);

            res.on('data', (chunk) => this._onData(chunk));
            res.on('end', () => this._onEnd());
            res.on('close', () => this._onClose());
            res.on('error', (e) => this._onError(e));
        });

        this._request.on('error', (e) => this._onError(e));
        this._request.on('close', () => this._onClose());
        this._request.end();

        // Write data to request body
        //req.write(postData);
        //req.end();
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
