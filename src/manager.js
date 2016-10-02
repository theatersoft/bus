import EventEmitter from './EventEmitter'
import node from './node'
import Bus from './Bus'

class Manager {
    constructor (bus) {
        // unused
    }

    init (node) {
        console.log('manager.init')
        this.node = node
        if (node.root) {
            this.names = new Map()
            this.nodes = new Map()
            node.registerObject('Bus', this)
        } else
            this.proxy = Bus.proxy('/Bus')
    }

    //addNode (name, _sender) {
    //    if (this.proxy) return this.proxy.addNode(name)
    //    if (this.nodes.has(name)) throw 'duplicate node name'
    //    this.nodes.set(name, _sender)
    //}
    //
    //removeNode (name, _sender) {
    //    if (this.proxy) return this.proxy.removeNode(name)
    //    if (!this.nodes.has(name)) throw 'missing node name'
    //    this.nodes.delete(name, obj)
    //    // remove node names
    //}

    addName (name, _sender) {
        if (this.proxy) return this.proxy.addName(name)
        console.log('manager.addName', name)
        if (this.names.has(name)) throw 'duplicate name'
        this.names.set(name, _sender)
        console.log('names', this.names)
    }

    resolveName (name, _sender) {
        if (this.proxy) return this.proxy.resolveName(name)
        console.log('manager.resolveName', name, this.names)
        if (!this.names.has(name)) throw 'missing name'
        console.log(this.names.get(name))
        return this.names.get(name)
    }

    removeName (name, _sender) {
        if (this.proxy) return this.proxy.removeName(name)
        console.log('manager.removeName', name)
        if (!this.names.has(name)) throw 'missing name'
        // check path?
        this.names.delete(name)
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