import { Signale } from 'signale'
import * as config from '../../config'
import { log } from '../../log'
import { createServer } from './server'

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

export async function runXmasMarketInterface (controller) {
  log.clear()
  log.banner('XMAS - SERVER')
  const server = await createServer(SERVER_PORT)
  xmasLog.santa('XMAS SERVER initialized!')
  xmasLog.santa(`XMAS SERVER listening on port: ${SERVER_PORT}`)

  server.onMessage(async (connection, data) => {
    const { utf8Data } = data
    const { type, content } = JSON.parse(utf8Data)
    xmasLog.santa(`${type}: ${content}`)

    switch(type) {
      case 'path':
        controller.addToPrintingQueue(content)
        controller.print().then(() => {
          connection.send(JSON.stringify({ type: 'finish' }))
        })
      break;
      case 'config':
        const ebbConfig = await import('../../../ebb-config.json')
        connection.send(JSON.stringify({ type: 'config', content: ebbConfig}))
      break;
      case 'stop':
        controller.emptyPrintingQueue()
      break;
    }
  })
}