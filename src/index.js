import { getLogger, startServer } from "koa-es-template";
import Index from "./routes/index.js";
import { prepareConsumer, setOnUpdate, startConsuming } from "./core/infrastructure/queue/index.js";
import * as storage from "./core/infrastructure/storage/index.js";

const logger = getLogger('CAC')
await startServer({ index: Index })
await prepareConsumer()
setOnUpdate(async message => {
    const [ [ , [ [ , [ , x ] ] ] ] ] = message
    const [ action, ...args ] = JSON.parse(x)
    await storage[action](...args)
        .catch(error => logger.error(error))
})
await startConsuming()
