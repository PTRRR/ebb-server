import EBB from './ebb'
import { runSerialPrompt, runEbbPrompt } from './cli'

async function initialize () {
  const serialConfig = await runSerialPrompt()
  const ebbConfig = await runEbbPrompt()
  console.log(serialConfig, ebbConfig)
}

initialize()