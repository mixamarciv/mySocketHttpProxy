import http from 'http';
import { log, logger } from '../logger';
import { config } from '../config';
import {
    TEventCallback,
    TEventErrorCallback,
    TEventDataCallback,
    IRequestData,
    IResponseData,
    IHost,
} from '../interface';
import {
    HttpRequestWorker,
    IHttpRequestWorkerOptions,
} from './HttpRequestWorker';
import {
    bufferToHexStr,
    getId,
    getMetaSizeFromBlock,
    getMetaSizeForNumber,
} from '../utils';

const ID_LENGTH = config.idRequestLength;
const META_LENGTH = config.metaBlockLength;

export interface IHttpClientOptions {
    sendRequestTo: IHost;
    logEvents?: boolean;
    logWorkerEvents?: boolean;
    onData: TEventDataCallback;
}

export class HttpClient {
    protected _options: IHttpClientOptions;
    protected _reqWorkers: Map<string, HttpRequestWorker>;

    constructor(config: IHttpClientOptions) {
        this._reqWorkers = new Map();
        this.setConfig(config);
    }

    setConfig(config: IHttpClientOptions): void {
        this._options = { ...config };
    }

    /**
     * Задаем параметры для отправки нового http запроса
     * @param data
     */
    setNewRequestData(data: Buffer): void {
        const requestData: IRequestData = JSON.parse(data.toString());

        this._onData(requestData);
    }

    protected _onData(requestData: IRequestData): void {
        this._log(
            `event data id: ${requestData.id}`,
            `headers: ${Object.keys(requestData.headers).length}`
        );

        const { id } = requestData;

        const results: Buffer[] = [Buffer.from(id)];
        let isStopped = false;
        const stopWorker = () => {
            if (!isStopped) {
                isStopped = true;

                const dataBuff = Buffer.concat(results);

                this._log(
                    `sendData id: ${requestData.id}`,
                    `size: ${dataBuff.length} `
                );
                this._sendData(dataBuff);
                this._stopWorker(id);
            }
        };

        const params: IHttpRequestWorkerOptions = {
            logEvents: this._options.logWorkerEvents,
            requestData,
            onResponse: (res) => {
                const responseData: IResponseData = {
                    headers: res.headers,
                };
                const responseDataJson = JSON.stringify(responseData);
                const metaSize = getMetaSizeForNumber(responseDataJson.length);
                const meta = Buffer.from(metaSize + responseDataJson);

                this._log(
                    `onResponse id: ${requestData.id}`,
                    `headers: ${Object.keys(responseData.headers).length}`,
                    `sizeMeta: ${responseDataJson.length} `
                );

                results.push(meta);
            },
            onData: (data1) => {
                // собираем данные
                results.push(data1);
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
        this._options.onData(data);
    }

    protected _log(...args): void {
        if (this._options.logEvents) {
            log('HttpClient', ...args);
        }
    }
}
