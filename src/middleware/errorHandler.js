import logger from '../utils/logger.js';

export default function errorHandler(err, req, res, next) {
    logger.error(err, req, res);

    const status = err.status || 500;
    const payload = err.message;
    res.status(status).send(payload);
}
