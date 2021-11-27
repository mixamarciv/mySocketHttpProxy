const { join } = require('path');
require('dotenv').config({ path: join(__dirname, 'config.env') });

const appName = process.argv.at(-1);

export interface IConfig {
    appName: string;
    logPath: string;
}

export const config: IConfig = {
    appName,
    logPath: join(__dirname, 'log', appName),
};
