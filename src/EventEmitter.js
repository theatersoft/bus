export default class EventEmitter {
    constructor () {
        this.events /*: Map<Event, Array<Callback>>*/ = new Map()
    }

    // aka addListener
    on (type, callback) {
        this.events.has(type) || this.events.set(type, [])
        this.events.get(type).push(callback)
        return this
    }

    // aka removeListener
    off (type, callback) {
        const callbacks = this.events.get(type)
        if (callbacks && callbacks.length)
            this.events.set(type, callbacks.filter(cb => cb !== callback))
    }

    emit (type, ...args) {
        const callbacks = this.events.get(type)
        if (callbacks && callbacks.length) {
            callbacks.forEach(cb =>
                cb(...args))
            return true
        }
        return false
    }
}
