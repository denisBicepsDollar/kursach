import {runWorker} from "../worker/worker.js";
import logger from "../utils/logger.js";

logger.info("Воркер запущен");
runWorker();