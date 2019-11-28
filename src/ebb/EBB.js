import * as commands from './serial-commands'
import { printPoint, clamp } from '../utils'
const MILLIMETER_IN_STEPS = 80

export default class EBB {
  constructor () {
    this.port = null
    this.config = null

    this.isRunning = false
    this.isDrawing = false
    this.pendingCommands = []

    this.position = [0, 0]
    this.speed = 50

    // Callbacks
    this.onFinishCallback = null
  }

  async initializeController (port, config) {
    return new Promise(async (resolve, reject) => {
      // Set a timeout delay
      const connectionTimeoutId = setTimeout(() => {
				reject('ERROR: Can\'t connect to the EggBotBoard.')
      }, 3000)

      this.initializeSerialConnection(port)
      await this.configureController(config)
      clearTimeout(connectionTimeoutId)
			resolve()
    })
  }

  initializeSerialConnection (port) {
    this.port = port
    this.port.on('data', buffer => {
      const datas = buffer.toString('utf-8').split(/\n\r|\r\n/)
      datas.splice(-1, 1)
      // Handle here serial data
    })
  }

  async configureController (config) {
    this.config = config
    const { minServoHeight, maxServoHeight, servoRate } = this.config
    
    await this.reset()
    await this.setServoMinHeight(minServoHeight)
    await this.setServoMaxHeight(maxServoHeight)
    await this.setServoRate(servoRate)

    // Configuration feedback
    await this.enableStepperMotors()
    await this.lowerBrush()
    await this.raiseBrush()
    await this.disableStepperMotors()
  }

  getConfig () {
    return this.config
  }

  async reset () {
    return commands.reset(this.port)
  }

  async setServoMinHeight (minHeight) {
    return commands.stepperAndServoModeConfigure(this.port, {
      parameter: 4,
      integer: minHeight
    })
  }

  async setServoMaxHeight (maxHeight) {
    return commands.stepperAndServoModeConfigure(this.port, {
      parameter: 5,
      integer: maxHeight
    })
  }

  async setServoRate (servoRate) {
    return commands.stepperAndServoModeConfigure(this.port, {
      parameter: 10,
      integer: servoRate
    })
  }

  async enableStepperMotors () {
    return commands.enableMotors(this.port, { enable1: 1, enable2: 1 })
  }

  async disableStepperMotors () {
    return commands.enableMotors(this.port, { enable1: 0, enable2: 0 })
  }

  // Movements

  async lowerBrush () {
    this.isDrawing = true
    return commands.setPenState(this.port, { state: 0, duration: 150 })
  }

  async raiseBrush () {
    this.isDrawing = false
    return commands.setPenState(this.port, { state: 1, duration: 150 })
  }
  //80step = 1mm
  async moveTo (targetX, targetY) {
    const [x, y] = this.position
    const {
      maxWidth,
      maxHeight,
      minStepsPerMillisecond,
      maxStepsPerMillisecond
    } = this.config

    targetX = clamp(targetX, 0, maxWidth * MILLIMETER_IN_STEPS)
    targetY = clamp(targetY, 0, maxHeight * MILLIMETER_IN_STEPS)

    const { amountX, amountY } = commands.getAmountSteps(x, y, targetX, targetY)
    const duration = commands.getDuration(
      this.speed,
      minStepsPerMillisecond,
      maxStepsPerMillisecond,
      amountX,
      amountY
    )

    // Reset position
    this.position = [targetX, targetY]

    const args = {
      duration,
      axisSteps1: amountX,
      axisSteps2: amountY,
      deltaStepsX: targetX - x,
      deltaStepsY: targetY - y,
      isDrawing: this.isDrawing
    }

    return commands.stepperMove(this.port, args)
  }

  // TODO: Implement low level move
  async lowLevelMoveTo (targetX, targetY) {
    const [x, y] = this.position
    const {
      maxWidth,
      maxHeight,
      minStepsPerMillisecond,
      maxStepsPerMillisecond
    } = this.config

    const STEP = 40 // μs
    const STEP_IN_SECONDS = 0.00004
    const ONE_STEP = 2147483648

    targetX = clamp(targetX, 0, maxWidth * MILLIMETER_IN_STEPS)
    targetY = clamp(targetY, 0, maxHeight * MILLIMETER_IN_STEPS)

    const { amountX, amountY } = commands.getAmountSteps(x, y, targetX, targetY)
    const duration = commands.getDuration(
      this.speed,
      minStepsPerMillisecond,
      maxStepsPerMillisecond,
      amountX,
      amountY
    )

    // Reset position
    this.position = [targetX, targetY]

    const stepsPerSeconds = 85855

    // const rateTerm1 =
    // console.log(amountX, amountY)

    const rateTerm1 = Math.abs(
      Math.round(stepsPerSeconds * (amountX / (duration / 1000)))
    )
    const rateTerm2 = Math.abs(
      Math.round(stepsPerSeconds * (amountY / (duration / 1000)))
    )

    return commands.lowLevelMove(this.port, {
      rateTerm1,
      axisSteps1: amountX,
      deltaR1: 0,
      rateTerm2,
      axisSteps2: amountY,
      deltaR2: 0,
      duration
    })
  }
}
