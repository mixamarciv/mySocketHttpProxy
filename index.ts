const { join } = require('path');
require('dotenv').config({ path: join(__dirname, 'config.env') });

import net from 'net';
import http from 'http';
import { URL } from 'url';
import { logUtils } from '../utils';

const logger = new logUtils.Logger({ path: join(__dirname, 'log') });
const log = logger.logCallback(0);

setTimeout(start, 100);
setTimeout(start, 2000);

const LISTEN_HTTP_PORT = Number(process.env.SERVER_HTTP_PORT);

function start(): void {
    log('start', process.argv);
    if (isHttpClient()) {
        require('./httpClient');
    }

    if (isHttpServer()) {
        require('./httpServer');
    }
}

function isHttpClient(): boolean {
    const arv = process.argv;
    return arv.at(-1) === 'httpClient';
}

function isHttpServer(): boolean {
    const arv = process.argv;
    return arv.at(-1) === 'httpServer';
}

/*
function start(config) {
    if (!config) {
        throw new Error('no config set');
    }

    for (var k in config) {
        startProxy(k, config[k]);
    }
}

function startProxy(name, config) {
    function info(message) {
        message =
            '\x1b[32m[' +
            new Date().toLocaleString() +
            ']\x1b[m ' +
            name +
            ':info ' +
            message;
        console.log.apply(console, arguments);
    }
    function warn(message) {
        message =
            '\x1b[33m[' +
            new Date().toLocaleString() +
            ']\x1b[m ' +
            name +
            ':warn ' +
            message;
        console.log.apply(console, arguments);
    }
    function debug(message) {
        message =
            '\x1b[36m[' +
            new Date().toLocaleString() +
            ']\x1b[m ' +
            name +
            ':debug ' +
            message;
        console.log.apply(console, arguments);
    }
    function error(message) {
        message =
            '\x1b[31m[' +
            new Date().toLocaleString() +
            ']\x1b[m ' +
            name +
            ':error ' +
            message;
        console.log.apply(console, arguments);
    }

    var server = net.createServer(function (client: any) {
        var remote;
        info(
            'client connected:',
            client.remoteAddress + ':' + client.remotePort
        );
        client.on('end', function () {
            debug(
                'client disconnected!',
                client.remoteAddress + ':' + client.remotePort
            );
            remote.destroy();
        });
        client.on('error', function (err) {
            error(
                'client error:',
                client.remoteAddress + ':' + client.remotePort,
                err
            );
            remote.destroy();
        });

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
    });

    server.listen(config[CONFIG_FIELD.LISTENPORT], function (err) {
        if (err) {
            error('listen porterror:' + config[CONFIG_FIELD.LISTENPORT]);
        } else {
            info(
                'listen port:' + config[CONFIG_FIELD.LISTENPORT] + ' success!!'
            );
        }
    });
}
*/
