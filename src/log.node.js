import util from 'util'
util.inspect.defaultOptions = {breakLength: Infinity}

export const log = console.log.bind(console)
export const warn = console.warn.bind(console)
export const error = console.error.bind(console)
