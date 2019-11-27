import SerialPort from 'serialport'

export async function getSerialList () {
  return []
}

export function getSerialPort (options = {}) {
  console.log(options)
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