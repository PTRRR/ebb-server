import signale from 'signale'

export function logSuccess (text) {
  return signale.success(text)
}

export function logError (text) {
  return signale.error(text)
}

export function logWarn (text) {
  return signale.warn(text)
}