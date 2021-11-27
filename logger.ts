import { config } from './config';
import { logUtils } from '../utils';

const logger = new logUtils.Logger({
    path: config.logPath,
});
const log = logger.logCallback(0);

log('start app ', config.appName);

export { logger, log };
