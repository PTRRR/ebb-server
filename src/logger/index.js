import fs from 'fs'
import path from 'path'
import signale from 'signale'
import figlet from 'figlet'

export function loadFont (fontPath) {
  return fs.readFileSync('text.txt', 'utf8');
}