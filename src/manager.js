import EventEmitter from './EventEmitter'
import node from './node'

class Manager {
    constructor () {
        this.names = new Map()
    }

    init (bus) {
        console.log('TODO Manager init')
        this.bus = bus
    }

    // TODO needs request metadata: sender
    requestName (name, node) {
        console.log('Manager.requestName')
    }

    releaseName (name, node) {
        console.log('Manager.releaseName')
    }

    register (name, obj) {
        if (node.root) {
            console.log('Manager.register as root ')
            //bus.registerObject(name, obj)
            this.names.set(name, obj)
            return Promise.resolve(true) // TODO BusObject
        } else {
            console.log('Manager.register as child ')
            return bus.request('/Bus.requestName', name, _i.node.name).then(r => {
                console.log('Manager.registered ')
                this.names.set(name, obj)
                return true
            })
        }
    }
}

//class BusEmitter {
//
//}
//
//class BusObject {
//    constructor (bus) {
//        this.bus = bus
//        this._emitter = new BusEmitter()
//    }
//
//    get emitter () {return this._emitter}
//}

export default new Manager()