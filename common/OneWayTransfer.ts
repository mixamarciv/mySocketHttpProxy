import { log, logger } from '../logger';
import { config } from '../config';
import { bufferToHexStr, getUuidOnlyNumLetters } from '../utils';
import {
    TAnyEventCallback,
    TEventCallback,
    TEventErrorCallback,
    TEventDataCallback,
} from '../interface';

const ID_LENGTH = 4;
const META_SIZE = 8;
const META_RADIX = 10;
const getUuid = getUuidOnlyNumLetters(ID_LENGTH);

export interface IOneWayTransferOptions {
    logEvents?: boolean;
    onData: TEventDataCallback;
    sendData: TEventDataCallback;
}

// интерфейс для полученной части данных
interface IRecivedData {
    readonly id: string; // для какого блока данных ждем следующую часть
    readonly size: number; // общий размер данных (то что должно прийти)
    data: Buffer[]; // уже полученная часть данных
    recivedSize: number; // полученный размер данных
}

/**
 * OneWayTransfer
 * получает сообщения на onData, собирает их в один кусок и отправляет в колбэк sendData
 */
export class OneWayTransfer {
    protected _options: IOneWayTransferOptions;
    protected _recivedData: IRecivedData;

    constructor(config: IOneWayTransferOptions) {
        this.setConfig(config);
        this._recivedData = null;
    }

    setConfig(config: IOneWayTransferOptions): void {
        this._options = { ...config };
    }

    onData(data: Buffer): void {
        if (!this._recivedData) {
            this._uploadFirstRecivedBlock(data);
        } else {
            this._uploadNextBlock(data);
        }
    }

    protected _uploadFirstRecivedBlock(data: Buffer): void {
        const id = getIdFromBlock(data);
        const size = getMetaSizeFromBlock(data);
        const dataBlock = data.subarray(ID_LENGTH + META_SIZE);
        const recivedSize = dataBlock.length;

        const recivedData = (this._recivedData = {
            id,
            size,
            recivedSize,
            data: [dataBlock],
        });

        if (recivedSize === size) {
            this._onReadyData();
        } else if (recivedSize > size) {
            recivedData.recivedSize = size;
            recivedData.data = [dataBlock.subarray(0, size)];
            this._onReadyData();
            this.onData(dataBlock.subarray(size));
        }
    }

    protected _uploadNextBlock(data: Buffer): void {
        const d = this._recivedData;
        const recivedSize = data.length;
        const needSize = d.size - d.recivedSize;

        if (recivedSize === needSize) {
            d.recivedSize += recivedSize;
            d.data.push(data);
            this._onReadyData();
        } else if (recivedSize > needSize) {
            d.recivedSize += needSize;
            d.data.push(data.subarray(0, needSize));
            this._onReadyData();
            this.onData(data.subarray(needSize));
        } else {
            d.recivedSize += recivedSize;
            d.data.push(data);
        }
    }

    protected _onReadyData(): void {
        const recivedData: IRecivedData = this._recivedData;
        const { id, size } = recivedData;
        const count = recivedData.data.length;
        const buff = Buffer.concat(recivedData.data);
        this._recivedData = null;

        this._log(
            `recived data id: ${id} `,
            `blocks: ${count} `,
            `size: ${size}`
        );
        this._options.onData(buff);
    }

    sendData(data: Buffer): void {
        const size = data.length;
        const id = getUuid();
        const sizeMeta = Number(size).toString(META_RADIX).padStart(META_SIZE);
        const meta = Buffer.from(id + sizeMeta);
        const buff = Buffer.concat([meta, data]);

        this._log(`send data id: ${id} `, `blocks: 1 `, `size: ${size}`);
        this._options.sendData(buff);
    }

    protected _log(...args): void {
        if (this._options.logEvents) {
            log('OneWayTransfer ', ...args);
        }
    }
}

function getIdFromBlock(data: Buffer): string {
    return data.subarray(0, ID_LENGTH).toString();
}

function getMetaSizeFromBlock(data: Buffer): number {
    const s = data.subarray(ID_LENGTH, ID_LENGTH + META_SIZE).toString();
    return parseInt(s, META_RADIX);
}
