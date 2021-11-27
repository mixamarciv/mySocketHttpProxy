import { logger, log } from './logger';
import { SocketServer, IServerOptions } from './httpSocketServer';

import net from 'net';
import http from 'http';
import { URL } from 'url';

const LISTEN_SOCKET_PORT = Number(process.env.SERVER_SOCKET_PORT);
const LISTEN_HTTP_PORT = Number(process.env.SERVER_HTTP_PORT);

startSocketProxy2();

function startSocketProxy2() {
    const config: IServerOptions = {
        logEvents: true,
        socketPort: LISTEN_SOCKET_PORT,
        httpPort: LISTEN_HTTP_PORT,
    };

    const socketServer = new SocketServer(config);

    socketServer.start();
}

/*startSocketProxy({
    httpPort: LISTEN_HTTP_PORT,
    socketPort: LISTEN_SOCKET_PORT,
});*/

interface IStartSocketProxy {
    httpPort: number;
    socketPort: number;
}

function startSocketProxy(config: IStartSocketProxy) {
    const httpServer = http.createServer((req, res) => {
        res.end('okay');
    });
    httpServer.listen(config.httpPort, () => {
        log(`httpServer listen port: ${config.httpPort} `);
    });

    const socketServer = createSocketServer(config.socketPort);
}

function createSocketServer(socketPort: number) {
    const socketServer = net.createServer(function (client: any) {
        log(
            'client connected:',
            client.remoteAddress + ':' + client.remotePort
        );
        client.write('ok123');

        client.on('data', function (data) {
            log(
                'client data: ',
                client.remoteAddress + ':' + client.remotePort,
                data
            );
        });
        client.on('end', function () {
            log(
                'client disconnected!',
                client.remoteAddress + ':' + client.remotePort
            );
        });
        client.on('error', function (err) {
            logger.error(
                'client error:',
                client.remoteAddress + ':' + client.remotePort,
                err
            );
        });

        /*
        var connectOption = {
            port: config[CONFIG_FIELD.REMOTEPORT],
            host: config[CONFIG_FIELD.REMOTEIP],
        };
        //proxy client
        remote = net.connect(connectOption, function (err) {
            if (err) {
                error('remote connected err!', err);
                client.end(err);
            } else {
                info('remote connected ', connectOption);
                client.pipe(remote);
                remote.pipe(client);
            }
        });
        remote.on('end', function (arg) {
            debug('remote disconnected!~:', client.remoteAddress);
            client.destroy();
        });
        remote.on('error', function (err) {
            error('remote error!~:', client.remoteAddress, err);
            client.destroy();
        });
        */
    });

    socketServer
        .listen(socketPort, () => {
            log(`socketServer listen port: ${socketPort} `);
        })
        .on('error', (err) => {
            logger.error(`server ERROR listen port: ${socketPort} `, err);
        });

    return socketServer;
}
