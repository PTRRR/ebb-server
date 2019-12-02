export const CONFIG_PATH = 'ebb-config.json'
export const DEVELOPMENT_ENV = 'development'
export const EBB_CONNECTION_TIMEOUT = 500
export const MILLIMETER_IN_STEPS = 80
export const ANIMATION_INTERVAL = 50
export const DEFAULT_FONT = 'computer'
export const FONTS_TO_LOAD = [
  { name: 'computer', path: 'fonts/computer.flf' },
  { name: 'cybermedium', path: 'fonts/cybermedium.flf' }
]
export const DEFAULT_EBB_CONFIG = {
  configName: 'A4_VERTICAL',
  maxWidth: 210,
  maxHeight: 148,
  minStepsPerMillisecond: 0.07,
  maxStepsPerMillisecond: 15,
  servoRate: 40000,
  minServoHeight: 20000,
  maxServoHeight: 16000,
  drawingSpeed: 40,
  movingSpeed: 70,
  minDeltaPositionForDistinctLines: 2
}
