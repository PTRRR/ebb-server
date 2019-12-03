import fs from 'fs'
import chalk from 'chalk'
import clear from 'clear'
import figlet from 'figlet'
import signale from 'signale'
import { Signale } from 'signale'
import { wait } from '../utils/time'
import { DEFAULT_FONT } from '../config'

const ebbSignale = new Signale({
  disabled: false,
  interactive: false,
  logLevel: 'info',
  secrets: [],
  scope: 'ebb',
  stream: process.stdout,
  types: {
    command: {
      badge: '*',
      color: 'blue',
      label: 'run',
      logLevel: 'info'
    }
  }
})

class Log {
  async loadFonts (fonts) {
    for (const { name, path } of fonts) {
      const font = await this.loadFont(path)
      figlet.parseFont(name, font);
    }
  }

  async loadFont (fontPath) {
    return new Promise((resolve, reject) => {
      const exists = fs.existsSync(fontPath)
      if (exists) {
        const font = fs.readFileSync(`${fontPath}`, 'utf8', error => {
          if (error) {
            reject(error)
          }
        })
        resolve(font)
      } else {
        resolve(null)
      }
    })
  }

  clear () {
    clear()
  }

  banner (text, font = DEFAULT_FONT) {
    const banner = figlet.textSync(text, font)
    console.log(chalk.red.bold(banner))
  }

  async animatedBanner (text, interval, font = DEFAULT_FONT) {
    let string = ''
    for (const letter of text) {
      this.clear()
      if (!string) await wait(interval)
      string += letter
      this.banner(string, font)
      await wait(interval)
    }
  }

  success (text) {
    return signale.success(text)
  }

  complete (text) {
    return signale.note(text)
  }

  command (text) {
    return ebbSignale.command(text)
  }

  note (text) {
    return signale.note(text)
  }

  warn (text) {
    return signale.warn(text)
  }

  error (text) {
    return signale.error(text)
  }
}

const log = new Log()
Object.freeze(log)

export { log }
