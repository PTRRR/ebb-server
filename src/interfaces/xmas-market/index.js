import Koa from 'koa'
import Router from 'koa-router'
import koaLogger from 'koa-logger'
import cors  from '@koa/cors'
import bodyparser from 'koa-bodyparser'
import { Signale } from 'signale'
import * as config from '../../config'
import { log } from '../../log'
import ip from 'ip'

const { SERVER_PORT, MILLIMETER_IN_STEPS } = config

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
  let isPrinting = false
  let printingQueue = []

  function addToPrintingQueue (path) {
    return [...printingQueue, ...path]
  }

  async function runControllerCommand (command, args = []) {
    if (controller.port && controller[command]) {
      await controller[command](...args)
    } else {
      return new Promise(resolve => {
        const values = args.length > 0 ? ` -> ${args.join(', ')}`: ''
        log.warn(`SIMULATION: ${command}${values}`)
        setTimeout(resolve, 50)
      })
    }
  }

  async function executePrintingQueue () {
    if (!isPrinting) {
      isPrinting = true
      const initialSpeed = controller.speed

      while (printingQueue.length > 0) {
        const point = printingQueue.shift()
        const { x, y, z, v: speed } = point

        if (z) await runControllerCommand('lowerBrush')
        else await runControllerCommand('raiseBrush')

        controller.speed = speed || initialSpeed
        const stepsX = Math.round(x * MILLIMETER_IN_STEPS)
        const stepsY = Math.round(y * MILLIMETER_IN_STEPS)
        await runControllerCommand('moveTo', [stepsX, stepsY])
      }

      controller.speed = initialSpeed
      await runControllerCommand('raiseBrush')
      await runControllerCommand('home')
      await runControllerCommand('disableStepperMotors')
      printingQueue = []
      isPrinting = false
      xmasLog.santa('Finished printing')
    }
  }
  
  const app = new Koa()
  const router = new Router()

  router.post('/print', async (ctx, next) => {
    const { body } = ctx.request
    const { path } = body
    
    if (path && controller) {
      printingQueue = addToPrintingQueue(path)
      log.success(`${path.length} points added to the printing queue!`)
      executePrintingQueue()
      ctx.status = 200
      await next()
    }
  })

  router.get('/config', async (ctx, next) => {
    const { default: config } = await import('../../../ebb-config.json')
    ctx.body = JSON.stringify(config)
    ctx.status = 200
    await next()
  })

  router.post('/stop', async (ctx, next) => {
    printingQueue = []
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
  
  xmasLog.santa('XMAS-SERVER initialized')
  xmasLog.santa(`Server host: localhost / ${ip.address()}`)
  xmasLog.santa(`Server port: ${SERVER_PORT}`)
}