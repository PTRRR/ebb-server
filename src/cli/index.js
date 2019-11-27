import qoa from 'qoa'
import { fakeSerialList } from '../serial-connection'

function getPortId(port) {
  const { name, manufacturer } = port
  return `${name} - ${manufacturer}`
}

export async function runSerialPrompt () {
  const serialList = fakeSerialList
  const config = await qoa.prompt([
    {
      type: 'interactive',
      query: 'Choose the serial port.',
      handle: 'port',
      menu: serialList.map(port => getPortId(port))
    }
  ])

  const { port } = config
  return serialList.find(it => getPortId(it) === port)
}

export async function runEbbPrompt () {
  return await qoa.prompt([
    {
      type: 'input',
      query: 'Config name',
      handle: 'configName'
    },
    {
      type: 'input',
      query: 'Enter max width [mm]:',
      handle: 'maxWidth'
    },
    {
      type: 'input',
      query: 'Enter max height [mm]:',
      handle: 'maxHeight'
    },
    {
      type: 'input',
      query: 'Enter min steps per millisecond:',
      handle: 'minStepsPerMillisecond'
    },
    {
      type: 'input',
      query: 'Enter max steps per millisecond:',
      handle: 'maxStepsPerMillisecond'
    },
    {
      type: 'input',
      query: 'Enter servo rate:',
      handle: 'servoRate'
    },
    {
      type: 'input',
      query: 'Enter min servo height:',
      handle: 'minServoHeight'
    },
    {
      type: 'input',
      query: 'Enter max servo height:',
      handle: 'maxServoHeight'
    },
    {
      type: 'input',
      query: 'Enter drawing speed:',
      handle: 'drawingSpeed'
    },
    {
      type: 'input',
      query: 'Enter moving speed:',
      handle: 'movingSpeed'
    }
  ])
}
