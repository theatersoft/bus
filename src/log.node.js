import util from 'util'
util.inspect.defaultOptions = {breakLength: Infinity}

let time, tag

const format = (...args) => ([
    ...(time ? [new Date().toLocaleTimeString('en', {hour12: false})] : []),
    ...(tag ? [tag] : []),
    ...args
])

export const setTag = val => {tag = val}
export const setTime = val => {time = val}

export const log = (...args) => console.log(...format(...args))
export const error = (...args) => console.error(...format(...args))
