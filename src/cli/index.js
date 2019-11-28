import qoa from 'qoa'
import { getSerialList } from '../serial-connection'

function getPortId(port) {
  const { path, manufacturer } = port
  return `${path} - ${manufacturer}`
}

export async function runSerialPrompt () {
  const serialList = await getSerialList()
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
  const defaultConfig = {
    configName: 'A4_VERTICAL',
    maxWidth: 210,
    maxHeight: 148,
    minStepsPerMillisecond: 0.07,
    maxStepsPerMillisecond: 15,
    servoRate: 40000,
    minServoHeight: 20000,
    maxServoHeight: 16000,
    drawingSpeed: 40,
    movingSpeed: 70,
    minDeltaPositionForDistinctLines: 2
  }

  const config = await qoa.prompt([
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

  for (const [key, value] of Object.entries(config)) {
    if (!value) {
      config[key] = defaultConfig[key]
    }
  }

  return config
}
