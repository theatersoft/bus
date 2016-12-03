import EventEmitter from './EventEmitter'
import node from './node'
import {proxy} from './proxy'
import {log} from 'log'

class Manager {
    init (path) {
        log(`manager.init as ${node.root ? 'root' : 'proxy'}`)
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
        log('manager.addNode', path)
        if (this.nodes.has(path)) return Promise.reject('duplicate node')
        this.nodes.set(path, new Array())
        return Promise.resolve()
    }

    removeNode (path) {
        if (this.proxy) return this.proxy.removeNode(path)
        log('manager.removeNode', path)
        if (!this.nodes.has(path)) return Promise.reject('missing node')
        for (let name of this.nodes.get(path))
            this.removeName(name) // TODO remove children
        this.nodes.delete(path)
        return Promise.resolve()
    }

    addName (name, _sender) {
        if (this.proxy) return this.proxy.addName(name)
        log('manager.addName', name)
        if (this.names.has(name)) return Promise.reject('duplicate name')
        this.names.set(name, _sender)
        if (!this.nodes.has(_sender)) return Promise.reject('missing node')
        this.nodes.get(_sender).push(name)
        return Promise.resolve()
    }

    resolveName (name) {
        if (this.proxy) return this.proxy.resolveName(name)
        if (!this.names.has(name)) return Promise.reject('missing name')
        log('manager.resolveName', name, this.names.get(name))
        return this.names.get(name)
    }

    removeName (name) {
        if (this.proxy) return this.proxy.removeName(name)
        log('manager.removeName', name)
        if (!this.names.has(name)) return Promise.reject('missing name')
        // check path?
        this.names.delete(name)
        return Promise.resolve()
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