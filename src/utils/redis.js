import { RedisURL } from "es-ioredis-url";
import { getLogger } from "koa-es-template";
import { generateObjectID } from "es-object-id";

export const redis = new RedisURL().getRedis()
export const streamConsumer = new RedisURL().getRedis()
export const streamProducer = new RedisURL().getRedis()
const logger = getLogger('REDIS')

const consumerId = generateObjectID()
export const prepareConsumer = async () => {
    logger.info('CREATING GROUP')
    await Promise.all([
        streamConsumer.xgroup('CREATE', '{CAC}:update_stream', 'cac_group', '$', 'MKSTREAM').catch(() => null),
        streamConsumer.xgroup('CREATE', '{CAC}:compete_stream', 'cac_group', '$', 'MKSTREAM').catch(() => null),
    ])

    logger.info('GROUP CREATED')

}
export const compete = () => redis.setnx('{CAC}:compete', consumerId)
export const startConsuming = async () => {
    const succeeded = await compete()
    if (succeeded) {
        const message = await streamConsumer.xreadgroup('GROUP', 'cac_group', consumerId, 'COUNT', 1, 'BLOCK', 0, '{CAC}:update_stream', '>')
        // TODO: 调用git接口
        logger.info(message)

        await redis.del('{CAC}:compete')
        await streamProducer.xadd('{CAC}:compete_stream', 'MAXLEN', '~', 1000, '*', 'compete', 'start')
    } else {
        await streamConsumer.xreadgroup('GROUP', 'cac_group', consumerId, 'COUNT', 1, 'BLOCK', 0, '{CAC}:compete_stream', '>')
    }
    startConsuming().catch(() => null)
}
