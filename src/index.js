import { startServer } from "koa-es-template";
import Index from "./routes/index.js";
import { use } from "es-fetch-api";
import fetch from 'node-fetch'
import { prepareConsumer } from "./utils/redis.js";

use(fetch)
await prepareConsumer()
await startServer({ index: Index })
