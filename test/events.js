'use strict'

const
    EventEmitter = require('@theatersoft/bus').EventEmitter

const emitter = new EventEmitter()

const c1 = () => {}
emitter.on('t1', c1)
emitter.on('t2', c1)
emitter.on('t3', c1)
emitter.off('t1', c1)
emitter.on('t2', c1)
emitter.off('t2', c1)
