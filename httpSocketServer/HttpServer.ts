import http, { IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';
import { log, logger } from '../logger';
import { config } from '../config';
import replace from 'buffer-replace';
import {
    bufferToHexStr,
    getId,
    getMetaSizeFromBlock,
    getMetaSizeForNumber,
} from '../utils';
import {
    TEventDataCallback,
    TEventConnectCallback,
    TEventCloseCallback,
    IRequestData,
    IResponseData,
} from '../interface';

const ID_LENGTH = config.idRequestLength;
const META_LENGTH = config.metaBlockLength;

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
            id: getId(),
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
        const httpReq = this._createHttpRequest(req, res);
        const id = httpReq.id;
        // this._log(httpReq, `new request id: ${id}`);

        const data: Buffer[] = [];
        req.on('data', (chunk: Buffer) => {
            data.push(chunk);
        });

        req.on('end', () => {
            const url = req.url;
            if (url === '/favicon.ico') return;

            const requestData: IRequestData = {
                id,
                url,
                method: req.method,
                headers: req.headers,
            };
            const requestDataJson = JSON.stringify(requestData);
            const requestBuff = Buffer.from(requestDataJson);

            this._log(
                httpReq,
                `new request id: ${id}`,
                `headers: ${Object.keys(requestData.headers).length}`,
                `size: ${requestBuff.length}`
            );
            this._options.onRequest(requestBuff);
        });
    }

    onGetDataFromClient(data: Buffer): void {
        const id = data.subarray(0, ID_LENGTH).toString();
        const result = data.subarray(ID_LENGTH);
        const httpReq = this._httpRequests.get(id);
        if (httpReq) {
            httpReq.result.push(result);
            this.sendResult(httpReq);
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

        const metaSize = getMetaSizeFromBlock(data);
        const metaBlock = data.subarray(META_LENGTH, META_LENGTH + metaSize);
        const responseData = getResponseDataFromMeta(metaBlock);
        const bodyData = data.subarray(META_LENGTH + metaSize);

        const headers = Object.entries(responseData?.headers || {});

        this._log(
            httpReq,
            `sendResult `,
            `headers: ${headers.length}`,
            `sizeMeta: ${metaSize}`,
            `size: ${bodyData.length}`
        );

        headers.forEach((value) => {
            httpReq.res.setHeader(value[0], value[1]);
        });
        httpReq.res.end(bodyData);

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

function getResponseDataFromMeta(data: Buffer): IResponseData {
    const metaBlock = data.toString();

    let responseData: IResponseData = null;
    try {
        responseData = JSON.parse(metaBlock);
    } catch (err) {
        log('metaBlock parse error', err);
    }
    return responseData;
}
