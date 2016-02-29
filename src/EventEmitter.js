'use strict'

class EventEmitter {
    constructor () {
        this.events = new Map()
    }
    addListener (type, callback) {
        this.events.has(type) || this.events.set(type, [])
        this.events.get(type).push(callback)
        return this
    }
    //removeListener (type, callback) {
    //    let
    //        events = this.events.get(type),
    //        index
    //
    //    if (events && events.length) {
    //        index = events.reduce((i, event, index) => {
    //            return (typeof event === 'function' && event === callback)
    //                ?  i = index
    //                : i
    //        }, -1)
    //
    //        if (index > -1) {
    //            events.splice(index, 1)
    //            this.events.set(type, events)
    //            return true
    //        }
    //    }
    //    return false
    //}
    emit (type, ...args) {
        let events = this.events.get(type)

        if (events && events.length) {
            events.forEach(event =>
                event(...args))
            return true
        }
        return false
    }
}

EventEmitter.prototype.on = EventEmitter.prototype.addListener

module.exports = EventEmitter