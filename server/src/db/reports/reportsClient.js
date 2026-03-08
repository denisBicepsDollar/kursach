import pkg from 'pg'
import logger from '../../utils/logger.js'
const {Client : ReportsClient} = pkg;

const reportsClient = new ReportsClient({
    host: 'localhost',
    port: 5432,
    user: 'denisbiceps',
    password: '12345678',
    database: 'reports'
})
await reportsClient.connect();
logger.info('База данных для состовления отчётов подключена');
export default reportsClient;
