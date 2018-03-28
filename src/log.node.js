import util from 'util'

util.inspect.defaultOptions = {breakLength: Infinity}

let time, tag

const format = (...args) => ([
    ...(time ? [new Date().toLocaleTimeString('en', {hour12: false})] : []),
    ...(tag ? [tag] : []),
    ...args
])

export const setTag = (val :string) => {tag = val.toUpperCase()}
export const setTime = (val :boolean) => {time = val}

export const debug = (...args :mixed[]) => console.log(...format(...args))
export const log = (...args :mixed[]) => console.log(...format(...args))
export const error = (...args :mixed[]) => console.error(...format(...args))
