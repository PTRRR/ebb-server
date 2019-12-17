import EBB from './ebb'
import { log } from './log'
import { wait } from './utils/time'
import { getSerialPort } from './serial'
import * as interfaces from './interfaces'

import {
  getConfig,
  runConfigSelectionPrompt,
  runSerialPrompt,
  runEbbPrompt,
  runInterfacePrompt,
  saveConfig
} from './cli'

import {
  CONFIG_PATH,
  DEVELOPMENT_ENV,
  FONTS_TO_LOAD,
  ANIMATION_INTERVAL
} from './config'

const { SERVER_ENV } = process.env

async function runConfigPrompts () {
  const existingConfig = await getConfig(CONFIG_PATH)

  if (SERVER_ENV === DEVELOPMENT_ENV) {
    return existingConfig
  }

  if (existingConfig) {
    const { useExistingConfig } = await runConfigSelectionPrompt()
    if (useExistingConfig) {
      return existingConfig
    }
  }

  log.clear()
  await log.animatedBanner('Serial', ANIMATION_INTERVAL)
  const serialConfig = await runSerialPrompt()

  log.clear()
  await log.animatedBanner('Controller', ANIMATION_INTERVAL)
  const ebbConfig = await runEbbPrompt()

  log.clear()
  await log.animatedBanner('Interface', ANIMATION_INTERVAL)
  const interfaceConfig = await runInterfacePrompt()

  return { serialConfig, ebbConfig, interfaceConfig }
}

async function initialize () {
  try {
    log.clear()
    await log.loadFonts(FONTS_TO_LOAD)
    await log.animatedBanner('SSC', ANIMATION_INTERVAL)

    const { serialConfig, ebbConfig, interfaceConfig } = await runConfigPrompts()
    log.clear()
    await log.animatedBanner('SSC', ANIMATION_INTERVAL)

    if (SERVER_ENV !== DEVELOPMENT_ENV) {
      await saveConfig(CONFIG_PATH, {
        serialConfig,
        ebbConfig,
        interfaceConfig
      })
      log.success('Config file saved!')
    }

    const ebb = new EBB()

    try {
      const serialPort = await getSerialPort(serialConfig)
      log.success('Serial port initialized!')
      await ebb.initializeController(serialPort, ebbConfig)
      log.success('EBB controller initialized!') 
    } catch (e) {
      log.error(e)
      log.warn('The server is running in simulation mode.')
    }

    const { interface: interfaceName } = interfaceConfig
    await interfaces[interfaceName](ebb)
  } catch (error) {
    log.error(error)
    process.exit(22)
  }
}

initialize()