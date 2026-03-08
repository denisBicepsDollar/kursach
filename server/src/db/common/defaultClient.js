import pkg from 'pg';
import logger from '../../utils/logger.js';
const {Client: DefaultClient} = pkg;

const defaultclient = new DefaultClient({
    host: 'localhost',
    port: 5432,
    user: 'denisbiceps',
    password: '12345678',
    database: 'defaultDb'
});

await defaultclient.connect();
logger.info('База данных defaultDb подключена')
export default defaultclient;
