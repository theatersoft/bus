import EventEmitter from './EventEmitter'
import node from './node'
import {proxy} from './proxy'
import log from 'log'

class Manager {
    init (path) {
        log.log(`manager.init as ${node.root ? 'root' : 'proxy'}`)
        if (node.root) {
            this.names /*: Map<BusName, BusPath>*/ = new Map()
            this.nodes /*: Map<BusPath, Array<BusName>>*/ = new Map()
            node.registerObject('Bus', this)
        } else
            this.proxy = proxy('/Bus')
        //this.proxies /*: Map<BusName, BusPath>*/ = new Map()
        this.addNode(path)
    }

    addNode (path) {
        if (this.proxy) return this.proxy.addNode(path)
        log.log('manager.addNode', path)
        if (this.nodes.has(path)) throw 'duplicate node'
        this.nodes.set(path, new Array())
    }

    removeNode (path) {
        if (this.proxy) return this.proxy.removeNode(path)
        log.log('manager.removeNode', path)
        if (!this.nodes.has(path)) throw 'missing node'
        for (let name of this.nodes.get(path))
            this.removeName(name) // TODO remove children
        this.nodes.delete(path)
    }

    addName (name, _sender) {
        if (this.proxy) return this.proxy.addName(name)
        log.log('manager.addName', name)
        if (this.names.has(name)) throw 'duplicate name'
        this.names.set(name, _sender)
        if (!this.nodes.has(_sender)) throw 'missing node'
        this.nodes.get(_sender).push(name)
    }

    resolveName (name) {
        if (this.proxy) return this.proxy.resolveName(name)
        if (!this.names.has(name)) throw 'missing name'
        log.log('manager.resolveName', name, this.names.get(name))
        return this.names.get(name)
    }

    removeName (name) {
        if (this.proxy) return this.proxy.removeName(name)
        log.log('manager.removeName', name)
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