import fs from 'fs'
import chalk from 'chalk'
import clear from 'clear'
import figlet from 'figlet'
import signale from 'signale'
import { DEFAULT_FONT } from '../config'

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

  success (text) {
    return signale.success(text)
  }

  complete (text) {
    return signale.complete(text)
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
