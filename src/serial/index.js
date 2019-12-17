import SerialPort from 'serialport'
import { log } from '../log'

export async function getSerialList () {
  return SerialPort.list()
}

export async function getSerialPort (options = {}) {
  const { path } = options
  return new Promise((resolve, reject) => {
    const port = new SerialPort(path)
    
    port.on('error', error => {
      log.warn(error)
      log.warn('Server is running in simulation mode')
      resolve(null)
    })

    port.on('open', () => {
      resolve(port)
    })
  })
}

export const fakeSerialList = [
  {
    name: 'COM2',
    manufacturer: 'EBBEgbotboard'
  },
  {
    name: 'COM3',
    manufacturer: 'EBBEgbotboard'
  },
  {
    name: 'COM4',
    manufacturer: 'EBBEgbotboard'
  },
  {
    name: 'COM5',
    manufacturer: 'EBBEgbotboard'
  }
]