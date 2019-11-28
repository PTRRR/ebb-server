import signale from 'signale'
import figlet from 'figlet'
import { loadFont } from './logger'
import EBB from './ebb'
import { runSerialPrompt, runEbbPrompt } from './cli'
import { getSerialPort } from './serial-connection'

async function initialize () {
  const font = loadFont('./fonts/banner4.flf');
  console.log(font)
  // figlet.defaults({ fontPath: "./fontssas" });
  // console.log(
  //   figlet.textSync('Hello World!!', {
  //     font: 'banner4',
  //     horizontalLayout: 'full',
  //     verticalLayout: 'default'
  //   })
  // )
  
  const serialConfig = await runSerialPrompt()
  const ebbConfig = await runEbbPrompt()

  const serialPort = getSerialPort(serialConfig)
  signale.success('Serial port initialized!')
  
  const ebb = new EBB()
  await ebb.initializeController(serialPort, ebbConfig)
  signale.success('EBB controller initialized & configured!')
}

initialize()