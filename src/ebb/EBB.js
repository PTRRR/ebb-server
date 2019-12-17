import Readline from '@serialport/parser-readline'
import hexToBinary from 'hex-to-binary'
import { clamp } from '../utils'
import { log } from '../log'
import * as commands from './serial-commands'
import { MILLIMETER_IN_STEPS, EBB_CONNECTION_TIMEOUT } from '../config'

export default class EBB {
  constructor () {
    this.port = null
    this.config = null

    this.isDrawing = false
    this.commandQueue = []

    this.position = [0, 0]
    this.speed = 70
  }

  async initializeController (port, config) {
    let initialized = false

    this.port = port
    this.speed = config.defaultSpeed || 60

    return new Promise(async (resolve, reject) => {
      const connectionTimeoutId = setTimeout(() => {
        reject('Can\'t connect to the EggBotBoard.')
      }, EBB_CONNECTION_TIMEOUT)

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
    await this.disableStepperMotors()
  }

  addToCommandQueue (command, resolve) {
    this.commandQueue.push({
      resolve,
      ...command
    })
  }

  parseStatus (status) {
    const binary = hexToBinary(status)
    const bits = binary.split('').map(it => parseInt(it))

    const [
      gpioPinRB5,
      gpioPinRB2,
      buttonPressed,
      penIsDown,
      commandExecuting,
      motor1Moving,
      motor2Moving,
      queueStatus
    ] = bits

    return {
      gpioPinRB5,
      gpioPinRB2,
      buttonPressed,
      penIsDown,
      commandExecuting,
      motor1Moving,
      motor2Moving,
      queueStatus
    }
  }

  getQueueFromStatus (status) {
    const { queueStatus } = this.parseStatus(status)
    return queueStatus
  }

  getMotorsFromStatus (status) {
    const { motor1Moving, motor2Moving } = this.parseStatus(status)
    return motor1Moving || motor2Moving
  }

  async waitUntilQueueIsEmpty () {
    return new Promise(async resolve => {
      const status = await this.getGeneralQuery()
      let queueStatus = this.getQueueFromStatus(status)
      let motorStatus = this.getMotorsFromStatus(status)
      
      while (queueStatus || motorStatus) {
        const status = await this.getGeneralQuery()
        queueStatus = this.getQueueFromStatus(status)
        motorStatus = this.getMotorsFromStatus(status)
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

  async penIsDown () {
    const status = await this.getGeneralQuery()
    const { penIsDown } = this.parseStatus(status)
    return penIsDown
  }

  async lowerBrush () {
    if (!await this.penIsDown()) {
      return new Promise(async resolve => {
        const command = await commands.setPenState(this.port, { state: 0, duration: 150 })
        this.addToCommandQueue(command, resolve)
      })
    }
  }

  async raiseBrush () {
    if (await this.penIsDown()) {
      return new Promise(async resolve => {
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
      this.position = [targetX, targetY]

      const { amountX, amountY } = commands.getAmountSteps(x, y, targetX, targetY)
      
      const duration = commands.getDuration(
        this.speed,
        minStepsPerMillisecond,
        maxStepsPerMillisecond,
        amountX,
        amountY
      )

      const args = {
        duration,
        axisSteps1: amountX,
        axisSteps2: amountY
      }

      const command = await commands.stepperMove(this.port, args)
      this.addToCommandQueue(command, resolve)
    })
  }
}
