import EBB from './ebb'
import { log } from './log'
import { wait } from './utils/time'
import { getSerialPort } from './serial-connection'
import { runCircleTest } from './tests'
import { getConfig, runConfigSelection, runSerialPrompt, runEbbPrompt, saveConfig } from './cli'
import { CONFIG_PATH, DEVELOPMENT_ENV, FONTS_TO_LOAD, ANIMATION_INTERVAL } from './config'
const { SERVER_ENV } = process.env

async function runConfigPrompts () {
  const existingConfig = await getConfig(CONFIG_PATH)

  if (SERVER_ENV === DEVELOPMENT_ENV) {
    return existingConfig
  }

  if (existingConfig) {
    const { useExistingConfig } = await runConfigSelection()
    if (useExistingConfig) {
      return existingConfig
    }
  }

  log.clear()
  await log.animatedBanner('Serial', ANIMATION_INTERVAL)
  const serialConfig = await runSerialPrompt()

  log.clear()
  await log.animatedBanner('EBB', ANIMATION_INTERVAL)
  const ebbConfig = await runEbbPrompt()

  return { serialConfig, ebbConfig }
}

async function initialize () {
  try {
    // Log intro banner
    await log.loadFonts(FONTS_TO_LOAD)
    await wait(200)
    await log.animatedBanner('SSC', ANIMATION_INTERVAL)

    const { serialConfig, ebbConfig } = await runConfigPrompts()
    log.clear()
    await log.animatedBanner('EBB - Server', ANIMATION_INTERVAL)

    if (SERVER_ENV !== DEVELOPMENT_ENV) {
      await saveConfig(CONFIG_PATH, { serialConfig, ebbConfig })
      log.success('Config file saved!')
    }

    const serialPort = await getSerialPort(serialConfig)
    log.success('Serial port initialized!')
    
    const ebb = new EBB()
    await ebb.initializeController(serialPort, ebbConfig)
    log.success('EBB controller initialized!')
    await runCircleTest(ebb)
  } catch (error) {
    log.error(error)
  }
}

log.clear()
initialize()