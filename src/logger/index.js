import signale from 'signale'

export function logSuccess (text) {
  return signale.success(text)
}

export function logWarn (text) {
  return signale.warn(text)
}