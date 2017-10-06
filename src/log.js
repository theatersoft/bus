import * as base from 'log'

const tag = 'BUS'
const format = (...args) => ([tag, ...args])

export const debug = (...args:any[]):void => base.debug(...format(...args))
export const log = (...args:any[]):void => base.log(...format(...args))
export const error = (...args:any[]):void => base.error(...format(...args))