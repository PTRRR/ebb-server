import Readline from '@serialport/parser-readline'
import hexToBinary from 'hex-to-binary'
import { clamp, wait } from '../utils'
import { log } from '../log'
import * as commands from './serial-commands'
import { MILLIMETER_IN_STEPS, EBB_CONNECTION_TIMEOUT } from '../config'

export default class EBB {
  constructor () {
    this.port = null
    this.config = null

    this.isPrinting = false
    this.isDrawing = false
    this.printingQueue = []
    this.commandQueue = []

    this.position = [0, 0]
    this.speed = 70
  }

  async initializeController (port, config) {
    let initialized = false
    this.port = port

    return new Promise(async (resolve, reject) => {
      const connectionTimeoutId = setTimeout(() => {
        reject('Can\'t connect to the EggBotBoard.')
      }, EBB_CONNECTION_TIMEOUT)

      // Resolve initial promise when we get the first feedback
      // from the board
      const parser = port.pipe(new Readline({ delimiter: '\r\n' }))
      parser.on('data', async data => {
        this.handleSerialData(data)

        if (!initialized) {
          initialized = true
          clearTimeout(connectionTimeoutId)
          await this.reset()
          await this.configureController(config)
          resolve()
        }
      })

      await this.getVersion()
    })
  }

  handleSerialData (data) {
    const command = this.commandQueue.pop() || {}
    const { type, resolve, logCommand, args } = command
    const message = args || data

    if (message && type && logCommand) {
      log.command(`${type}: ${message}`.trim())
    }

    if (resolve) {
      resolve(`${data}`.trim())
    }
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

  addToPrintingQueue (array) {
    this.printingQueue = [
      ...this.printingQueue,
      ...array
    ]
  }

  emptyPrintingQueue () {
    this.printingQueue = []
  }

  async print () {
    if (!this.isPrinting) {
      this.isPrinting = true
      while (this.printingQueue.length > 0) {
        const [ x, y, down ] = this.printingQueue.splice(0, 3)
        if (down) await this.lowerBrush()
        else await this.raiseBrush()
        await this.moveTo(Math.round(x), Math.round(y))
      }
      
      await this.raiseBrush()
      await this.home()
      await this.disableStepperMotors()
      this.printingQueue = []
      this.isPrinting = false
    }
  }

  addToCommandQueue (command, resolve) {
    this.commandQueue.push({
      resolve,
      ...command
    })
  }

  parseStatus (status) {
    const binary = hexToBinary(status)

    const [
      gpioPinRB5,
      gpioPinRB2,
      buttonPressed,
      penIsDown,
      commandExecuting,
      motor1Moving,
      motor2Moving,
      queueStatus
    ] = binary.split('')

    return {
      gpioPinRB5: parseInt(gpioPinRB5),
      gpioPinRB2: parseInt(gpioPinRB2),
      buttonPressed: parseInt(buttonPressed),
      penIsDown: parseInt(penIsDown),
      commandExecuting: parseInt(commandExecuting),
      motor1Moving: parseInt(motor1Moving),
      motor2Moving: parseInt(motor2Moving),
      queueStatus: parseInt(queueStatus)
    }
  }

  getQueueStatus (status) {
    const { queueStatus } = this.parseStatus(status)
    return queueStatus
  }

  getMotorsStatus (status) {
    const { motor1Moving, motor2Moving } = this.parseStatus(status)
    return motor1Moving || motor2Moving
  }

  async waitUntilQueueIsEmpty () {
    return new Promise(async resolve => {
      const status = await this.getGeneralQuery()
      let queueStatus = this.getQueueStatus(status)
      let motorStatus = this.getMotorsStatus(status)
      
      while (queueStatus || motorStatus) {
        const status = await this.getGeneralQuery()
        queueStatus = this.getQueueStatus(status)
        motorStatus = this.getMotorsStatus(status)
      }

      resolve()
    })
  }

  async getGeneralQuery () {
    return new Promise(async resolve => {
      const command = await commands.generalQuery(this.port)
      this.addToCommandQueue(command, resolve)
    })
  }

  async getVersion () {
    return new Promise(async resolve => {
      const command = await commands.version(this.port)
      this.addToCommandQueue(command, resolve)
    })
  }

  async reset () {
    return new Promise(async resolve => {
      const command = await commands.reset(this.port)
      this.addToCommandQueue(command, resolve)
    })
  }

  async setServoMinHeight (minHeight) {
    return new Promise(async resolve => {
      const command = await commands.stepperAndServoModeConfigure(this.port, {
        parameter: 4,
        integer: minHeight
      })

      this.addToCommandQueue(command, resolve)
    })
  }

  async setServoMaxHeight (maxHeight) {
    return new Promise(async resolve => {
      const command = await commands.stepperAndServoModeConfigure(this.port, {
        parameter: 5,
        integer: maxHeight
      })

      this.addToCommandQueue(command, resolve)
    })
  }

  async setServoRate (servoRate) {
    return new Promise(async resolve => {
      const command = await commands.stepperAndServoModeConfigure(this.port, {
        parameter: 10,
        integer: servoRate
      })

      this.addToCommandQueue(command, resolve)
    })
  }

  async enableStepperMotors () {
    return new Promise(async resolve => {
      const command = await commands.enableMotors(this.port, {
        enable1: 1,
        enable2: 1
      })

      this.addToCommandQueue(command, resolve)
    })
  }

  async disableStepperMotors () {
    return new Promise(async resolve => {
      await this.waitUntilQueueIsEmpty()
      const command = await commands.enableMotors(this.port, {
        enable1: 0,
        enable2: 0
      })

      this.addToCommandQueue(command, resolve)
    })
  }

  // Movements

  async lowerBrush () {
    if (!this.isDrawing) {
      return new Promise(async resolve => {
        this.isDrawing = true
        const command = await commands.setPenState(this.port, { state: 0, duration: 150 })
        this.addToCommandQueue(command, resolve)
      })
    }
  }

  async raiseBrush () {
    if (this.isDrawing) {
      return new Promise(async resolve => {
        this.isDrawing = false
        const command = await commands.setPenState(this.port, { state: 1, duration: 150 })
        this.addToCommandQueue(command, resolve)
      })
    }
  }

  async home () {
    return new Promise(async resolve => {
      const command = await commands.homeMove(this.port, { stepRate: 10000 })
      this.position = [0, 0]
      this.addToCommandQueue(command, resolve)
    })
  }

  //80step = 1mm
  async moveTo (targetX, targetY) {
    return new Promise(async resolve => {
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

      const command = await commands.stepperMove(this.port, args)
      this.addToCommandQueue(command, resolve)
    })
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
