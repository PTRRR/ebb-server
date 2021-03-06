import fs from 'fs'
import qoa from 'qoa'
import { log } from '../log'
import { DEFAULT_EBB_CONFIG } from '../config'
import { getSerialList } from '../serial'
import * as interfaces from '../interfaces'

export async function getConfig (configPath) {
  return new Promise((resolve, reject) => {
    const exists = fs.existsSync(configPath)
    if (exists) {
      const config = fs.readFileSync(`${configPath}`, 'utf8', error => {
        if (error) {
          reject(error)
        }
      })
      resolve(JSON.parse(config))
    } else {
      resolve(null)
    }
  })
}

function getPortId(port) {
  const { path, manufacturer } = port
  return `${path} - ${manufacturer}`
}

export async function runConfigSelectionPrompt () {
  return qoa.prompt([
    {
      type: 'interactive',
      query: 'Do you want to use an existing config file?',
      handle: 'useExistingConfig',
      menu: [true, false]
    }
  ])
}

export async function runSerialPrompt () {
  const serialList = await getSerialList()
  const config = await qoa.prompt([
    {
      type: 'interactive',
      query: 'Select a serial port:',
      handle: 'port',
      menu: serialList.map(port => getPortId(port))
    }
  ])

  const { port } = config
  return serialList.find(it => getPortId(it) === port)
}

export async function runEbbPrompt () {
  const config = await qoa.prompt([
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
      query: 'Enter default speed:',
      handle: 'defaultSpeed'
    }
  ])

  for (const [key, value] of Object.entries(config)) {
    if (!value) {
      const defaultValue = DEFAULT_EBB_CONFIG[key]
      config[key] = defaultValue
      log.warn(`Default ${key}: ${defaultValue}`)
    } else {
      config[key] = parseFloat(value)
    }
  }

  return config
}

export async function saveConfig (name, config) {
  return new Promise((resolve, reject) => {
    try {
      fs.writeFileSync(`${name}`, JSON.stringify(config))
      resolve()
    } catch (error) {
      reject(error)
    }
  })
}

export async function runInterfacePrompt () {
  return qoa.prompt([
    {
      type: 'interactive',
      query: 'Select a server interface:',
      handle: 'interface',
      menu: Object.keys(interfaces)
    }
  ])
}
