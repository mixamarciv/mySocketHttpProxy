import net from 'net';
import http, { IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';
import { wait, getUuidOnlyNumLetters } from '../../utils';
import { log, logger } from '../logger';
import { config } from '../config';
import { SocketServer } from './SocketServer';

const REQUEST_ID_LENGTH = config.idRequestLength;
const getUuid = getUuidOnlyNumLetters(REQUEST_ID_LENGTH);

export interface IHttpServerOptions {
    socketServer: SocketServer;
    httpPort: number;
    logEvents?: boolean;
}

interface IHttpRequest {
    id: string;
    req: IncomingMessage;
    res: ServerResponse;
}

export class HttpServer {
    protected _options: IHttpServerOptions;
    protected _socketServer: SocketServer = null;
    protected _httpServer: http.Server = null;
    protected _httpRequests: Map<string, IHttpRequest>;

    constructor(config: IHttpServerOptions) {
        this._httpRequests = new Map();
        this.setConfig(config);
    }

    setConfig(config: IHttpServerOptions): void {
        this._options = { ...config };
        this._socketServer = config.socketServer;
        this._socketServer.setHandler('data', (client, data: Buffer) => {
            // TODO: надо поправить, - тут ошибка, данные приходят разными блоками,
            // не в том же порядке как их отправляют
            this.onGetResult(data.toString());
        });
    }

    start(): void {
        this._startHttpServer();
    }

    protected _startHttpServer(): void {
        const { httpPort } = this._options;
        this._httpServer = http.createServer((req, res) => {
            const httpReq = this._createHttpRequest(req, res);
            this.sendRequest(httpReq);
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
        };

        this._httpRequests.set(httpReq.id, httpReq);

        return httpReq;
    }

    sendRequest(httpReq: IHttpRequest): void {
        this._log(httpReq, 'new request');

        const id = httpReq.id;
        const url = httpReq.req.url;

        const requestStr = `${id}${url}`;
        this._socketServer.sendDataToClient(requestStr);
    }

    onGetResult(data: string): void {
        const id = data.substr(0, REQUEST_ID_LENGTH);
        const result = data.substr(REQUEST_ID_LENGTH);
        const httpReq = this._httpRequests.get(id);
        if (httpReq) {
            const getResultWithoutId = (text: string) => {
                return text.replace(new RegExp(`${id}`, 'g'), '');
            };
            const regexpEnd = new RegExp(`(${id}|)\/${id}\$`);
            const hasEndData = regexpEnd.test(result);
            if (hasEndData) {
                const resultWithoutEndStr = result.replace(regexpEnd, '');
                httpReq.res.end(getResultWithoutId(resultWithoutEndStr));
                this._httpRequests.delete(id);
            } else {
                httpReq.res.write(getResultWithoutId(result));
            }
        } else {
            this._log(`ERROR req id: ${id} not found`);
        }
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
