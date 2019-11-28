import SerialPort from 'serialport'

export async function getSerialList () {
  return SerialPort.list()
}

export function getSerialPort (options = {}) {
  const { path } = options
  return new SerialPort(path)
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