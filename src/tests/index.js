export async function runCircleTest (ebb) {
  await ebb.moveTo(1000, 1000)
  await ebb.moveTo(-1000, -1000)
}