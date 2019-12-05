import { Signale } from 'signale'
import { SERVER_PORT } from '../../config'
import { log } from '../../log'
import { createServer } from './server'

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

  server.onMessage((connection, data) => {
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
      case 'stop':
        controller.emptyPrintingQueue()
      break;
    }
  })
}