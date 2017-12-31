import * as base from 'log'

const tag = 'BUS'
const format = (...args :mixed[]) => ([tag, ...args])

export const debug = (...args :mixed[]) :void => base.debug(...format(...args))
export const log = (...args :mixed[]) :void => base.log(...format(...args))
export const error = (...args :mixed[]) :void => base.error(...format(...args))