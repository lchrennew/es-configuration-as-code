import { Controller } from "koa-es-template";
import * as storage from "../core/infrastructure/storage/index.js";

export default class Index extends Controller {
    constructor(config, ...middlewares) {
        super(config, ...middlewares);
        this.get('/configs/info', this.getOne)
        this.get('/configs/exists', this.exists)
        this.get('/configs', this.find)
        this.post('/configs/multiple', this.getMultiple)
        this.put('/configs', this.save)
        this.delete('/configs/info', this.remove)

        this.eventBus.on('save', async (config, operator) => {
            this.logger.info('SAVING...')
            try {
                await storage.save(config, operator)
                this.logger.info('SAVED.')
            } catch (error) {
                this.logger.info('NOT SAVED.')
                this.logger.info(config, operator)
                this.logger.error(error)
            }
        })

        this.eventBus.on('delete', async (kind, name, operator) => {
            this.logger.info('DELETING...')
            try {
                await storage.removeOne(kind, name, operator)
                this.logger.info('DELETED.')
            } catch (error) {
                this.logger.info('NOT DELETED.')
                this.logger.info(kind, name, operator)
                this.logger.error(error)
            }
        })
    }

    async getOne(ctx) {
        const { kind, name, ref } = ctx.query
        ctx.body = await storage.getOne(kind, name, ref).catch(() => null)
    }

    async getMultiple(ctx) {
        const { list, full } = ctx.request.body
        ctx.body = await storage.getMultiple({ list, full }).catch(() => [])
    }

    async find(ctx) {
        const { kind, prefix, full } = ctx.query
        ctx.body = await storage.find(kind, prefix, full).catch(() => [])
    }

    async exists(ctx) {
        const { kind, name, ref } = ctx.query
        const config = await storage.getOne(kind, name, ref).catch(() => null)
        ctx.body = !!config
    }

    async save(ctx) {
        const { kind, name, metadata, spec } = ctx.request.body
        const { operator } = ctx.headers
        this.eventBus.emitAsync('save', { kind, name, metadata: metadata ?? {}, spec: spec ?? {} }, operator)
        ctx.body = { ok: true }
    }

    async remove(ctx) {
        const { kind, name } = ctx.query
        const operator = ctx.request.body
        this.eventBus.emitAsync('delete', kind, name, operator)
        ctx.body = { ok: true }
    }

}
