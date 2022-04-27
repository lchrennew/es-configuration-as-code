import { generateObjectID } from "es-object-id";
import { redis, streamConsumer, streamProducer } from "../../../utils/redis.js";
import { getLogger } from "koa-es-template";

const logger = getLogger('REDIS')
const consumerId = generateObjectID()

const keepAlive = () => setInterval(() => {
    redis.setex(`{CAC}:consumer:${consumerId}`, 5, 'alive')
}, 1000)

const isAlive = async () => {
    const host = await redis.get('{CAC}:compete')
    return redis.exists(`{CAC}:consumer:${host}`)
}

export const prepareConsumer = async () => {
    keepAlive()
    logger.info('CREATING GROUP')
    await Promise.all([
        streamConsumer.xgroup('CREATE', '{CAC}:update_stream', 'cac_group', '$', 'MKSTREAM').catch(() => null),
        streamConsumer.xgroup('CREATE', '{CAC}:compete_stream', 'cac_group', '$', 'MKSTREAM').catch(() => null),
    ])

    logger.info('GROUP CREATED')
}
const createNewRound = () => redis.setnx('{CAC}:compete', consumerId)
const endThisRound = () => redis.del('{CAC}:compete')
const waitForUpdate = () => streamConsumer.xreadgroup('GROUP', 'cac_group', consumerId, 'COUNT', 1, 'BLOCK', 0, 'STREAMS', '{CAC}:update_stream', '>')
const startNextRound = () => streamProducer.xadd('{CAC}:compete_stream', 'MAXLEN', '~', 1000, '*', 'compete', 'start')
const waitForNextRound = async () => {
    const alive = await isAlive()
    logger.info('[乙方*]', alive ? '我还活着' : '已失联')
    if (alive) {
        logger.info('[未中标]', '继续等')
        await streamConsumer.xreadgroup('GROUP', 'cac_group', consumerId, 'COUNT', 1, 'BLOCK', 10000, 'NOACK', 'STREAMS', '{CAC}:compete_stream', '>');
        logger.info('[未中标]', '等不耐烦了')
    } else {
        logger.info('[未中标]', '废标')
        endThisRound()
    }
}

let onUpdate = message => logger.info(message)
export const setOnUpdate = f => onUpdate = f

export const startConsuming = async () => {
    logger.info('[投标] 投标')
    const succeeded = await createNewRound()
    logger.info('[投标]', succeeded ? '【成功】' : '【失败】')
    if (succeeded) {
        logger.info('[乙方] 等待需求')
        const message = await waitForUpdate()
        logger.info('[乙方] 需求已来到')
        // 如果在这里挂了怎么办？
        // TODO: 调用git接口
        logger.info('[乙方] 实现需求')
        await onUpdate(message)
        logger.info('[乙方] 实现已需求')

        logger.info('[乙方] 验收')
        await endThisRound()
        logger.info('[乙方] 验收完成')

        logger.info('[甲方] 放标啦')
        await startNextRound()
    } else {
        logger.info('[未中标] 等待下次放标')
        await waitForNextRound()
    }
    logger.info('[甲方] 放标')
    startConsuming().catch((error) => logger.error(error))
}

export const request = message => redis.xadd('{CAC}:update_stream', '*', 'message', JSON.stringify(message))
