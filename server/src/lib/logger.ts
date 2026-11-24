/**
 * Minimal structured (JSON-lines) logger. Callers must not pass personal
 * data: no emails, names, phone numbers, locations, tokens or request bodies
 * (PRD §12.3, §12.4).
 */
export type LogFields = Record<string, string | number | boolean | undefined>

export interface Logger {
  info(msg: string, fields?: LogFields): void
  warn(msg: string, fields?: LogFields): void
  error(msg: string, fields?: LogFields): void
}

export function createLogger(
  write: (line: string) => void = (l) => process.stdout.write(l + '\n'),
): Logger {
  const log =
    (level: string) =>
    (msg: string, fields: LogFields = {}) =>
      write(JSON.stringify({ time: new Date().toISOString(), level, msg, ...fields }))
  return { info: log('info'), warn: log('warn'), error: log('error') }
}

export const silentLogger: Logger = { info() {}, warn() {}, error() {} }
