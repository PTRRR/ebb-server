import { log } from '../log'
import { wait } from '../utils/time'

export async function runCircleTest (ebb) {
  const segments = 20
  const radius = 7000
  await ebb.enableStepperMotors()
  for (let i = 0; i < segments + 1; i++) {
    const x = (Math.cos(i / segments * Math.PI * 2) * 0.5 + 0.5) * radius
    const y = (Math.sin(i / segments * Math.PI * 2) * 0.5 + 0.5) * radius
    await ebb.moveTo(x, y)
  }
  
  await ebb.waitUntilQueueIsEmpty()
  await wait(100)
  await ebb.home()
  await ebb.waitUntilQueueIsEmpty()
  await ebb.disableStepperMotors()
  log.banner('Completed!', 'cybermedium')
}
