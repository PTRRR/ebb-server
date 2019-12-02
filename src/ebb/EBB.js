import Readline from '@serialport/parser-readline'
import { clamp, wait } from '../utils'
import { log } from '../log'
import * as commands from './serial-commands'
import { MILLIMETER_IN_STEPS, EBB_CONNECTION_TIMEOUT } from '../config'

export default class EBB {
  constructor () {
    this.port = null
    this.config = null

    this.isRunning = false
    this.isDrawing = false
    this.commandQueue = []

    this.position = [0, 0]
    this.speed = 50
  }

  async initializeController (port, config) {
    let initialized = false
    this.port = port
    this.config = config

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
          await wait(1000)
          await this.reset()
          await this.configureController(config)
          resolve()
        }
      })

      await this.getVersion()
    })
  }

  handleSerialData (data) {
    const { type, resolve, logCommand, args } = this.commandQueue.pop() || {}
    
    if ((data || args) && type && logCommand) {
      const message = args || data
      log.complete(`${type}: ${message}`.trim())
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

  addToCommandQueue (command, resolve) {
    this.commandQueue.push({
      resolve,
      ...command
    })
  }

  async waitUntilQueueIsEmpty () {
    return new Promise(async resolve => {
      let status = await this.getGeneralQuery()
      while (status !== 'D0') {
        status = await this.getGeneralQuery()
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
    return new Promise(async resolve => {
      this.isDrawing = true
      const command = await commands.setPenState(this.port, { state: 0, duration: 150 })
      this.addToCommandQueue(command, resolve)
    })
  }

  async raiseBrush () {
    return new Promise(async resolve => {
      this.isDrawing = false
      const command = await commands.setPenState(this.port, { state: 1, duration: 150 })
      this.addToCommandQueue(command, resolve)
    })
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
