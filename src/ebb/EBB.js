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
    await this.waitOnCommand(this.lowerBrush())
    await this.waitOnCommand(this.raiseBrush())
    this.disableStepperMotors()
  }

  getConfig () {
    return this.config
  }

  async feed (rawGcode) {
    for (const gcode of rawGcode.split('\n')) {
      const parsedGcode = gcodeToObject(gcode)
      this.pendingCommands.push(parsedGcode)
    }

    if (!this.isRunning) {
      this.isRunning = true
      this.run()
    }
  }

  async writeNextCommand () {
    if (this.pendingCommands.length > 0) {
      const nextCommand = this.pendingCommands.shift()
      return this.executeCommand(nextCommand)
    }
  }

  async executeCommand (gcodeCommand) {
    const { drawingSpeed, movingSpeed } = this.config
    const { command, args } = gcodeCommand

    if (command) {
      switch (command) {
      case 'G0': {
        const { x, y } = args
        this.speed = movingSpeed
        return this.moveTo(x, y)
      }
      case 'G1': {
        const { x, y } = args
        this.speed = drawingSpeed
        return this.moveTo(x, y)
      }
      case 'G10': {
        return this.raiseBrush()
      }
      case 'G11': {
        return this.lowerBrush()
      }
      }
    } else {
      return null
    }
  }

  async wait (delay) {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve()
      }, delay)
    })
  }

  async waitOnCommand (promise) {
    return new Promise(resolve => {
      promise.then(({ duration }) => {
        if (duration) {
          setTimeout(() => {
            resolve()
          }, duration)
        } else {
          resolve()
        }
      })
    })
  }

  async run () {
    console.log('Printing...')
    const start = new Date()

    let motionDuration = 0
    let stepsX = 0
    let stepsY = 0
    let totalDistance = 0
    while (this.pendingCommands.length > 0 && this.isRunning) {
      await this.writeNextCommand().then(command => {
        if (command) {
          const { type, duration, state, deltaStepsX, deltaStepsY, isDrawing } = command
          switch (type) {
          case 'SM':
            stepsX += Math.abs(deltaStepsX)
            stepsY += Math.abs(deltaStepsY)
            if (isDrawing) {
              const distance = Math.sqrt(Math.pow(deltaStepsX / 80, 2) + Math.pow(deltaStepsY / 80, 2))
              totalDistance += distance
            }
            printPoint(`${type} - [${deltaStepsX}, ${deltaStepsY}]`)
            break
          case 'SP':
            printPoint(`${type} - [${state}]`)
            break
          }

          if (duration) {
            motionDuration += duration
          }
        }
      })
    }

    this.raiseBrush()
    const end = new Date()
    const elapsedTime = end.getTime() - start.getTime()
    await this.wait(motionDuration - elapsedTime)
    // TODO: Improve logs
    console.log('-------------------\n')
    console.log(
      `TOTAL MOTION DURATION: ${Math.round(motionDuration / 1000)} seconds`
    )
    console.log(`TOTAL STEPS [X, Y]: [${stepsX}, ${stepsY}]`)
    console.log(`TOTAL DISTANCE IN MM [X, Y]: [${Math.round(stepsX / 80)}, ${Math.round(stepsY / 80)}]`)
    console.log(`TOTAL DISTANCE IN CM: ${totalDistance / 10}`)
    console.log('\n-------------------')

    // Start end sequences
    this.speed = 90
    await this.waitOnCommand(this.moveTo(0, 0))
    await this.wait(500)
    this.disableStepperMotors()
    console.log('Finished printing')
    this.stop()
    if (this.onFinishCallback) this.onFinishCallback()
  }

  stop () {
    this.isRunning = false
    this.pendingCommands = []
  }

  onFinish (callback) {
    this.onFinishCallback = callback
  }

  // Configuration

  async reset () {
    return helpers.reset(this.port)
  }

  async setServoMinHeight (minHeight) {
    return helpers.stepperAndServoModeConfigure(this.port, {
      parameter: 4,
      integer: minHeight
    })
  }

  async setServoMaxHeight (maxHeight) {
    return helpers.stepperAndServoModeConfigure(this.port, {
      parameter: 5,
      integer: maxHeight
    })
  }

  async setServoRate (servoRate) {
    return helpers.stepperAndServoModeConfigure(this.port, {
      parameter: 10,
      integer: servoRate
    })
  }

  async enableStepperMotors () {
    return helpers.enableMotors(this.port, { enable1: 1, enable2: 1 })
  }

  async disableStepperMotors () {
    return helpers.enableMotors(this.port, { enable1: 0, enable2: 0 })
  }

  // Movements

  async lowerBrush () {
    this.isDrawing = true
    return helpers.setPenState(this.port, { state: 0, duration: 150 })
  }

  async raiseBrush () {
    this.isDrawing = false
    return helpers.setPenState(this.port, { state: 1, duration: 150 })
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

    const { amountX, amountY } = helpers.getAmountSteps(x, y, targetX, targetY)
    const duration = helpers.getDuration(
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

    return helpers.stepperMove(this.port, args)
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

    const { amountX, amountY } = helpers.getAmountSteps(x, y, targetX, targetY)
    const duration = helpers.getDuration(
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

    return helpers.lowLevelMove(this.port, {
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
