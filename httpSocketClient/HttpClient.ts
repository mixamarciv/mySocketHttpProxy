import net from 'net';
import http from 'http';
import { IHost } from '../config';
import { URL } from 'url';
import { wait } from '../../utils';
import { log, logger } from '../logger';
import { SocketClient } from './SocketClient';
import { config } from '../config';

const REQUEST_ID_LENGTH = config.idRequestLength;

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
    protected _requests: Map<string, http.ServerResponse>;

    constructor(config: IHttpClientOptions) {
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
        const url = data.substr(REQUEST_ID_LENGTH);

        const result = { id, url };

        const data1 = JSON.stringify(result);

        // отправляем данные
        this._sendData(`${id}${data1}`);

        // отправляем информацию о том что это конец данных
        this._sendData(`${id}/${id}`);
    }

    protected _sendData(data: string): void {
        this._socketClient.sendData(data);
    }

    protected _sendRequestTo(url: string): void {}

    protected _log(...args): void {
        if (this._options.logEvents) {
            log('HttpClient', ...args);
        }
    }
}
