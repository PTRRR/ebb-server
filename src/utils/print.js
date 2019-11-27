function stringify (elem) {
  if (elem || elem === '') {
    return JSON.stringify(elem).replace(/"/g, '')
  } else {
    return 'undefined'
  }
}

export function printTitle (title) {
  console.log('\n***********************************************\n')
  console.log(` ${stringify(title).toUpperCase()}`)
  console.log('\n***********************************************\n')
}

export function printMessage (message) {
  console.log(` ${stringify(message)}`)
}

export function printPoint (point) {
  switch (typeof point) {
    case 'object':
      for (const [key, value] of Object.entries(point)) {
        writePoint(`${key}: ${stringify(value)}`)
      }
      break
    case 'array':
      for (const value of point) {
        writePoint(value)
      }
      break
    default:
      writePoint(point)
      break
  }
}

function writePoint (point) {
  console.log(` ->  ${stringify(point)}`)
}

export function printError (error) {
  drawSkull()
  console.log('\nxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx\n')
  console.log(` ERROR:\n ${stringify(error).toUpperCase()}`)
  console.log('\nxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx\n')
}

function drawSkull () {
  console.log(
    `
     _____      _____      _____
    /     \\    /     \\    /     \\
   | () () |  | () () |  | () () |
    \\  ^  /    \\  ^  /    \\  ^  /
     |||||      |||||      |||||
     |||||      |||||      |||||
  `
  )
}
