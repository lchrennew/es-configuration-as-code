import { Controller } from "koa-es-template";
import * as storage from "../core/infrastructure/storage/index.js";

export default class Index extends Controller {
    constructor(config, ...middlewares) {
        super(config, ...middlewares);
        this.get('/configs/info', this.getOne)
        this.get('/configs', this.find)
        this.put('/configs', this.save)
        this.delete('/configs/info', this.remove)
    }

    async getOne(ctx) {
        const { kind, name, ref } = ctx.query
        const data = await storage.getOne(kind, name, ref)
        if (!data) ctx.body = { ok: false, error: `cannot found ${kind}/${name} of ${ref}` }
        ctx.body = { ok: true, data }
    }

    async find(ctx) {
        const { kind, prefix } = ctx.query
        const data = await storage.find(kind, prefix)
        ctx.body = { ok: true, data }
    }

    async save(ctx) {
        const { kind, name, metadata, spec, operator } = ctx.request.body
        await storage.save({ kind, name, metadata, spec }, operator)
        ctx.body = { ok: true }
    }

    async remove(ctx) {
        const { kind, name } = ctx.query
        const operator = ctx.request.body
        await storage.removeOne(kind, name, operator)
        ctx.body = { ok: true }
    }

}
