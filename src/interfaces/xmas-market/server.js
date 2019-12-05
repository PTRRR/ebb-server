import websocket from 'websocket'
import { log } from '../../log'
const { server: WebSocketServer } = websocket

export function createServer(port) {
  return new Promise((resolve, reject) => {
    const http = require('http')

    const httpServer = http.createServer((request, response) => {
      response.writeHead(404)
      response.end()
    })

    const websocketServer = new WebSocketServer({ httpServer });

    websocketServer.on('request', request => {
      const connection = request.accept(null, request.origin)
      connection.on('message', function (message) {
        if (websocketServer.onMessageCallback) {
          websocketServer.onMessageCallback(connection, message)
        }
      })

      connection.on('close', () => {
        log.note(`Peer ${connection.remoteAddress} disconnected.`)
      })
    })

    websocketServer.onMessage = callback => {
      websocketServer.onMessageCallback = callback
    }

    httpServer.listen(port, () => {
      resolve(websocketServer)
    })
  })
}
