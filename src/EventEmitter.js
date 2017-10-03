//@flow
export type Listener = (...args:Array<any>) => void

export const mixinEventEmitter = (Base:any) => class Mixin extends Base {
    events:Map<string, Array<Listener>>

    constructor (...args:Array<any>) {
        super(...args)
        this.events = new Map()
    }

    // aka addListener
    on (type:string, callback:Listener) /*:this*/ {
        this.events.has(type) || this.events.set(type, [])
        // $FlowFixMe:possibly undefined
        this.events.get(type).push(callback)
        return this
    }

    // aka removeListener
    off (type:string, callback:Listener) /*:this*/ {
        const callbacks = this.events.get(type)
        if (callbacks && callbacks.length)
            this.events.set(type, callbacks.filter(cb => cb !== callback))
        return this
    }

    emit (type:string, ...args:Array<any>):boolean {
        const callbacks = this.events.get(type)
        if (callbacks && callbacks.length) {
            callbacks.forEach(cb =>
                cb(...args))
            return true
        }
        return false
    }
}

export default class EventEmitter extends mixinEventEmitter(class {}) {}
