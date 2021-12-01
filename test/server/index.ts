import { config } from './config';
import path from 'path';
import {
    express as expressUtils,
    IResult,
    appAbout,
    getServerMeta,
    addStartTimeInfo,
    addMethodSendJson,
    IResponse,
    CustomError,
    getErrorDumpData,
} from './utils';
import express, { query, Request } from 'express';

const SERVER_PORT = config.redirectRequestTo.port;

const bodyParser = express.json();
export const app: express.Application = express();

const helpText = `
    get: /load?viewInHtml=1&method=match&id=<string>
`;

app.use(addStartTimeInfo);
app.all('/', appAbout({ text: helpText }));
app.use(addMethodSendJson);
app.get('/favicon.ico', (req, res) => res.send('not need'));
app.get('/public/*', (req, res, next) => {
    const options = {
        root: path.join(__dirname, 'public'),
        dotfiles: 'deny',
        headers: {
            'x-timestamp': Date.now(),
            'x-sent': true,
        },
    };

    const fileName = req.path.replace(/^\/public/g, '');
    res.sendFile(fileName, options, (err) => {
        if (err) {
            next(err);
        } else {
            console.log('Sent:', fileName);
        }
    });
});

app.get('*', async (req, res: any) => {
    const q = req.query;
    const method = (req.path as string).substr(1);

    let result: IResult = {
        ok: false,
        data: method,
        errors: [getErrorDumpData(new Error())],
    };

    res.sendJson(result);
});

app.all('*', (req, res: any) => {
    res.sendJson({ ok: false, errors: [req.path + ' not found'] });
});

expressUtils.startServer(app, SERVER_PORT);
