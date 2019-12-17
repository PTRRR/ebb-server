import EBB from './ebb'
import { log } from './log'
import { wait } from './utils/time'
import { getSerialPort } from './serial'
import { xmasMarket } from './interfaces'

import {
  getConfig,
  runConfigSelectionPrompt,
  runSerialPrompt,
  runEbbPrompt,
  saveConfig
} from './cli'

import {
  CONFIG_PATH,
  DEVELOPMENT_ENV,
  FONTS_TO_LOAD,
  ANIMATION_INTERVAL,
  SERVER_PORT
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

  return { serialConfig, ebbConfig }
}

async function initialize () {
  try {
    // Log intro banner
    log.clear()
    await log.loadFonts(FONTS_TO_LOAD)
    await wait(200)
    await log.animatedBanner('SSC', ANIMATION_INTERVAL)

    const { serialConfig, ebbConfig } = await runConfigPrompts()
    log.clear()
    await log.animatedBanner('SSC', ANIMATION_INTERVAL)

    if (SERVER_ENV !== DEVELOPMENT_ENV) {
      await saveConfig(CONFIG_PATH, { serialConfig, ebbConfig })
      log.success('Config file saved!')
    }

    const ebb = new EBB()
    const serialPort = await getSerialPort(serialConfig)

    if (serialPort) {
      log.success('Serial port initialized!')
      
      await ebb.initializeController(serialPort, ebbConfig)
      log.success('EBB controller initialized!') 
    }

    await xmasMarket(ebb)

  } catch (error) {
    log.error(error)
    process.exit(22)
  }
}

initialize()