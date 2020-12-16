const ENABLED = true

const noop = (): void => {}

/**
 * Log if enabled
 * @param  {Array<string>} ...args
 */
export default function (scope: string, color: string) {
  if (!ENABLED) return noop

  return function (s: string, ...args: Array<any>) {
    console.log(`%c ${scope} ${s}`, `color: ${color}`, ...args)
  }
}
