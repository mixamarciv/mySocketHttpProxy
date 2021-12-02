export type TEventCallback = () => void;
export type TEventDataCallback = (buf: Buffer) => void;
export type TEventErrorCallback = (err: Error) => void;
export type TAnyEventCallback =
    | TEventCallback
    | TEventDataCallback
    | TEventErrorCallback;
