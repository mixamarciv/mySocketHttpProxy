export * from '../utils';

export function bufferToHexStr(buf: Buffer): string {
    const arr = buf.toJSON().data;
    arr.length = arr.length < 100 ? arr.length : 100;
    return arr.reduce((s, n) => (s += n.toString(16) + ' '), '').trim();
}
