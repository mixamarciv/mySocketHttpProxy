export * from '../utils';

import { getUuidOnlyNumLetters } from '../utils';
import { config } from './config';

const ID_LENGTH = config.idRequestLength;
const META_SIZE = config.metaBlockLength;
const META_RADIX = config.metaBlockRadix;
export const getId = getUuidOnlyNumLetters(ID_LENGTH);

export function bufferToHexStr(buf: Buffer): string {
    const arr = buf.toJSON().data;
    arr.length = arr.length < 100 ? arr.length : 100;
    return arr.reduce((s, n) => (s += n.toString(16) + ' '), '').trim();
}

export function getMetaSizeFromBlock(data: Buffer): number {
    const s = data.subarray(0, META_SIZE).toString();
    return parseInt(s, META_RADIX);
}

export function getMetaSizeForNumber(n: number): string {
    return Number(n).toString(META_RADIX).padStart(META_SIZE);
}
