import EBB from './ebb'
import { logSuccess, logError } from './logger'
import { CONFIG_PATH } from './config'
import { getSerialPort } from './serial-connection'
import { runCircleTest } from './tests'
import { getConfig, runConfigSelector, runSerialPrompt, runEbbPrompt, saveConfig } from './cli'

async function runConfigPrompts () {
  const existingConfig = await getConfig(CONFIG_PATH)

  if (existingConfig) {
    const { useExistingConfig } = await runConfigSelector()
    if (useExistingConfig) {
      return existingConfig
    }
  }

  const serialConfig = await runSerialPrompt()
  const ebbConfig = await runEbbPrompt()

  return { serialConfig, ebbConfig }
}

async function initialize () {
  try {
    const { serialConfig, ebbConfig } = await runConfigPrompts()
    saveConfig(CONFIG_PATH, { serialConfig, ebbConfig })
    logSuccess('Config file saved!')

    const serialPort = getSerialPort(serialConfig)
    logSuccess('Serial port initialized!')
    
    const ebb = new EBB()
    await ebb.initializeController(serialPort, ebbConfig)
    logSuccess('EBB controller initialized!')
    await runCircleTest(ebb)
  } catch (error) {
    logError(error)
  }
}

initialize()