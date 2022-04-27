import { RedisURL } from "es-ioredis-url";
import { getLogger } from "koa-es-template";
import { generateObjectID } from "es-object-id";

export const redis = new RedisURL().getRedis()
export const streamConsumer = new RedisURL().getRedis()
export const streamProducer = new RedisURL().getRedis()

