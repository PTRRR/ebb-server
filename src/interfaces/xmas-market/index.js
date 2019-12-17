import Koa from 'koa'
import Router from 'koa-router'
import koaLogger from 'koa-logger'
import cors  from '@koa/cors'
import bodyparser from 'koa-bodyparser'
import { Signale } from 'signale'
import * as config from '../../config'
import { log } from '../../log'
import ip from 'ip'

const { SERVER_PORT } = config

const xmasLog = new Signale({
  disabled: false,
  interactive: false,
  logLevel: 'info',
  secrets: [],
  stream: process.stdout,
  types: {
    santa: {
      badge: '🎅',
      color: 'red',
      label: 'xmas',
      logLevel: 'info'
    }
  }
})

export async function xmasMarket (controller) {
  log.clear()
  log.banner('XMAS - SERVER')
  
  const app = new Koa()
  const router = new Router()

  router.post('/print', async (ctx, next) => {
    const { body } = ctx.request
    const { path } = body
    
    if (path) {
      log.success(`${path.length} points added to the printing queue!`)
      ctx.status = 200
      await next()
    }
  })

  router.get('/config', async (ctx, next) => {
    const ebbConfig = await import('../../../ebb-config.json')
    ctx.body = JSON.stringify(ebbConfig)
    ctx.status = 200
    await next()
  })

  router.post('/config', async (ctx, next) => {
    const { body } = ctx.request
    const { config } = body
    await next()
  })

  router.post('/stop', async (ctx, next) => {
    log.success('Clear printing queue!')
    ctx.status = 200
    await next()
  })

  router.post('/length', async (ctx, next) => {
    const { body } = ctx.request
    const { path } = body

    let totalLength = 0
    let lastPoint = null
    for(const point of path) {
      if (lastPoint) {
        const { x: lastX, y: lastY, z: lastZ } = lastPoint || {}
        const { x, y, z } = point

        if (lastZ && z) {
          const length = Math.sqrt(Math.pow(x - lastX, 2) + Math.pow(y - lastY, 2))
          totalLength += length
        }
      }

      lastPoint = point
    }

    ctx.body = JSON.stringify({ length: totalLength })
    ctx.status = 200
    await next()
  })

  app.use(cors())
  app.use(koaLogger())
  app.use(bodyparser())
  app.use(router.routes())
  app.use(router.allowedMethods())
  app.listen(SERVER_PORT)
  
  // Log endpoints
  const { stack } = router
  for (const endpoint of stack) {
    const { methods, path } = endpoint
    xmasLog.santa(`${methods.join(' ')} -> ${path}`)
  }

  log.note(`Server running on: ${ip.address()}`)
  log.note(`Server listening on port: ${SERVER_PORT}`)
}