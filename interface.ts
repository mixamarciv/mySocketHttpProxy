import net from 'net';
import { IncomingHttpHeaders, IncomingMessage } from 'http';

export type TEventCallback = () => void;
export type TEventDataCallback = (buf: Buffer) => void;
export type TEventCloseCallback = (err?: Error) => void;
export type TEventErrorCallback = (err: Error) => void;
export type TEventConnectCallback = (client: net.Socket) => void;
export type TEventResponseCallback = (response: IncomingMessage) => void;

export type TAnyEventCallback =
    | TEventCallback
    | TEventDataCallback
    | TEventCloseCallback
    | TEventErrorCallback;

export interface IHost {
    host: string;
    port: number;
}

export interface IRequestData {
    id: string;
    url: string;
    method: string;
    headers: IncomingHttpHeaders;
}

export interface IResponseData {
    headers: IncomingHttpHeaders;
}
