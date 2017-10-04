import * as base from 'log'

const tag = 'BUS'
const format = (...args) => ([tag, ...args])

export const debug = (...args) => base.debug(...format(...args))
export const log = (...args) => base.log(...format(...args))
export const error = (...args) => base.error(...format(...args))