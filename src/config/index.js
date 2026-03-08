import fs from 'fs';
import path from 'path';
import {fileURLToPath} from "url";

console.log('Инициализация конфига')
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configPath = path.resolve(__dirname,'config.json');

console.log('ConfigPath = ', configPath);
const raw = fs.readFileSync(configPath, 'utf8');

const fileConfig = JSON.parse(raw);

const config = {
    port : fileConfig?.main?.port,
    logLevel: fileConfig?.main?.logLevel.toLowerCase(),
};
console.log('port and logLevel = ', config.port, config.logLevel )

console.log('Конфиг успех')

export default config;
