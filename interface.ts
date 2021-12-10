import net from 'net';

export type TEventCallback = () => void;
export type TEventDataCallback = (buf: Buffer) => void;
export type TEventCloseCallback = (err?: Error) => void;
export type TEventErrorCallback = (err: Error) => void;
export type TEventConnectCallback = (client: net.Socket) => void;

export type TAnyEventCallback =
    | TEventCallback
    | TEventDataCallback
    | TEventCloseCallback
    | TEventErrorCallback;
