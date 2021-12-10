import { log, logger } from '../logger';
import { config } from '../config';
import { bufferToHexStr, getUuidOnlyNumLetters } from '../utils';
import {
    TAnyEventCallback,
    TEventCallback,
    TEventErrorCallback,
    TEventDataCallback,
} from '../interface';

const REQUEST_ID_LENGTH = config.idRequestLength;
const getUuid = getUuidOnlyNumLetters(REQUEST_ID_LENGTH);

export interface IOneWayTransferOptions {
    logEvents?: boolean;
    onData: TEventDataCallback;
    sendData: TEventDataCallback;
}

const getIdFromData = (data: Buffer): string =>
    data.subarray(0, REQUEST_ID_LENGTH).toString();

const getDataWithoutId = (data: Buffer): Buffer =>
    data.subarray(REQUEST_ID_LENGTH);

enum EReadyType {
    forSend = 'forSend',
    forEmit = 'forEmit',
}

interface IReadyData {
    id: string;
    type: EReadyType;
    data: Buffer;
}

/**
 * OneWayTransfer
 * получает сообщения на onData, собирает их в один кусок и отправляет в колбэк sendData
 */
export class OneWayTransfer {
    protected _options: IOneWayTransferOptions;
    protected _getData: Buffer[];
    protected _sendData: Buffer[];
    protected _readyData: IReadyData[]; // готовые для отправки блоки данных
    protected _waitConfirmForId: string; // для какого блока данных ждем подтверждения

    constructor(config: IOneWayTransferOptions) {
        this._getData = [];
        this._sendData = [];
        this.setConfig(config);
    }

    setConfig(config: IOneWayTransferOptions): void {
        this._options = { ...config };
    }

    onData(data: Buffer): void {
        this._getData.push(data);
    }

    onEndData(): void {
        const buff = Buffer.concat(this._getData);
        this._getData = [];
        this._addReadyData(EReadyType.forEmit, buff);
    }

    sendData(data: Buffer): void {
        this._sendData.push(data);
    }

    sendEndData(): void {
        const buff = Buffer.concat(this._sendData);
        this._sendData = [];
        this._addReadyData(EReadyType.forSend, buff);
    }

    protected _addReadyData(type: EReadyType, data: Buffer): void {
        this._log(
            `ready data ${type} `,
            `size: ${data.length}`
            // `buff: ${bufferToHexStr(Buffer.from(data))}`
        );
        if (type === EReadyType.forSend) this._options.sendData(data);
        if (type === EReadyType.forEmit) this._options.onData(data);
    }

    protected _log(...args): void {
        if (this._options.logEvents) {
            log('OneWayTransfer ', ...args);
        }
    }
}
