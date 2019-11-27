export function compareTo (object = {}, to = {}) {
  let diverge = false
  for (const [key, value] of Object.entries(to)) {
    if (object[key] !== value) {
      diverge = true
    }
  }
  return !diverge
}
