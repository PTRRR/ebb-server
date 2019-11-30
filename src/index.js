import EBB from './ebb'
import { log } from './log'
import { wait } from './utils/time'
import { getSerialPort } from './serial-connection'
import { runCircleTest } from './tests'
import { getConfig, runConfigSelection, runSerialPrompt, runEbbPrompt, saveConfig } from './cli'
import { CONFIG_PATH, DEVELOPMENT_ENV, FONTS_TO_LOAD } from './config'
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

  await log.clear()
  await log.banner('Serial Config', 'cybermedium')
  const serialConfig = await runSerialPrompt()

  await log.clear()
  await log.banner('EBB Config', 'cybermedium')
  const ebbConfig = await runEbbPrompt()

  return { serialConfig, ebbConfig }
}

async function initialize () {
  try {
    // Log intro banner
    await log.clear()
    await log.loadFonts(FONTS_TO_LOAD)
    await log.banner('- SSC -')

    const { serialConfig, ebbConfig } = await runConfigPrompts()

    await wait(1000)
    await log.clear()
    await log.banner('EBB - Server', 'cybermedium')

    if (SERVER_ENV !== DEVELOPMENT_ENV) {
      await saveConfig(CONFIG_PATH, { serialConfig, ebbConfig })
      log.success('Config file saved!')
    }

    const serialPort = await getSerialPort(serialConfig)
    log.success('Serial port initialized!')
    
    const ebb = new EBB()
    await ebb.initializeController(serialPort, ebbConfig)
    log.success('EBB controller initialized!')
    // await runCircleTest(ebb)
  } catch (error) {
    log.error(error)
  }
}

initialize()