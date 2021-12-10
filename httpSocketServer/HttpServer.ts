import net from 'net';
import http, { IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';
import { wait, getUuidOnlyNumLetters } from '../../utils';
import { log, logger } from '../logger';
import { config } from '../config';
import { OneWaySocketServer } from './OneWaySocketServer';
import replace from 'buffer-replace';
import { bufferToHexStr } from '../utils';
import {
    TEventDataCallback,
    TEventConnectCallback,
    TEventCloseCallback,
} from '../interface';

const REQUEST_ID_LENGTH = config.idRequestLength;
const getUuid = getUuidOnlyNumLetters(REQUEST_ID_LENGTH);

export interface IHttpServerOptions {
    httpPort: number;
    logEvents?: boolean;
    onRequest: TEventDataCallback;
}

interface IHttpRequest {
    id: string;
    req: IncomingMessage;
    res: ServerResponse;
    result: Buffer[];
}

export class HttpServer {
    protected _options: IHttpServerOptions;
    protected _httpServer: http.Server = null;
    protected _httpRequests: Map<string, IHttpRequest>;

    constructor(config: IHttpServerOptions) {
        this._httpRequests = new Map();
        this.setConfig(config);
    }

    setConfig(config: IHttpServerOptions): void {
        this._options = { ...config };
    }

    start(): void {
        const { httpPort } = this._options;
        this._httpServer = http.createServer((req, res) => {
            this.processRequest(req, res);
        });
        this._httpServer
            .listen(httpPort, () => {
                log(`httpServer listen port: ${httpPort} `);
            })
            .on('error', (err) => {
                logger.error(`httpServer ERROR listen port: ${httpPort} `, err);
            });
    }

    protected _createHttpRequest(
        req: IncomingMessage,
        res: ServerResponse
    ): IHttpRequest {
        const httpReq: IHttpRequest = {
            id: getUuid(),
            req,
            res,
            result: [],
        };

        this._httpRequests.set(httpReq.id, httpReq);

        return httpReq;
    }

    /**
     * Обрабатывает запрос к httpServer'у
     */
    processRequest(req: IncomingMessage, res: ServerResponse): void {
        const url = req.url;
        if (url === '/favicon.ico') {
            return;
        }

        const httpReq = this._createHttpRequest(req, res);
        const id = httpReq.id;
        this._log(httpReq, 'new request');

        const requestStr = `${id}${url}`;
        this._options.onRequest(Buffer.from(requestStr));
    }

    onGetDataFromClient(data: Buffer): void {
        const id = data.subarray(0, REQUEST_ID_LENGTH).toString();
        const result = data;
        const httpReq = this._httpRequests.get(id);
        if (httpReq) {
            const getResultWithoutId = (buf: Buffer) => {
                return replace(buf, id, '');
            };
            const endText = Buffer.from(`${id}\/${id}`);
            const hasEndText = result.indexOf(endText) >= 0;

            if (hasEndText) {
                const resultWithoutEndText = replace(result, endText, '');
                httpReq.result.push(getResultWithoutId(resultWithoutEndText));
                this.sendResult(httpReq);
            } else {
                httpReq.result.push(getResultWithoutId(result));
            }
        } else {
            this._log(`ERROR req id: ${id} not found`);
        }
    }

    /**
     * Отправляет httpClient'у полученные данные с socketClient'а
     * @param httpReq
     */
    sendResult(httpReq: IHttpRequest): void {
        const id = httpReq.id;

        const data = Buffer.concat(httpReq.result);
        this._log(
            httpReq,
            'sendResult: ',
            `size: ${data.length}`
            // `buff: ${bufferToHexStr(data)}`
        );
        httpReq.res.end(data);

        this._httpRequests.delete(id);
    }

    protected _log(httpReq: IHttpRequest | any, ...args): void {
        if (this._options.logEvents) {
            let reqInfo = 'HttpServer';
            let logArgs = [...args];
            if (httpReq && httpReq.id) {
                const size = this._httpRequests.size;
                reqInfo += ` ${httpReq.id}/count: ${size} |${httpReq.req.url}`;
            } else {
                logArgs.unshift(httpReq);
            }
            log(reqInfo, ...logArgs);
        }
    }
}
