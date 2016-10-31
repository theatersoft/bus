import EventEmitter from './EventEmitter'
import node from './node'
import manager from './manager'
import {proxy} from './proxy'
import executor from './executor'
import connection from 'connection'
import log from 'log'

let start = executor()

class Bus extends EventEmitter {
    start (context) {
        if (!start.started) {
            start.started = true
            connection.create(context)
                .then(() => {
                    if (connection.hasParent) {
                        const conn = connection.createParentConnection()
                            .on('open', () => {
                                log.log('parent open')
                            })
                            .on('close', () => {
                                log.log('parent close')
                            })
                            .on('connect', name => {
                                this.name = name
                                node.init(conn)
                                start.resolve(this)
                            })
                            .on('error', err => {
                                log.error('parent error', err)
                                start.reject(err)
                            })
                    } else {
                        this.name = '/'
                        node.init()
                        start.resolve(this)
                    }
                })
        }
        return start.promise
    }

    started () {
        return start.promise
    }

    registerObject (name, obj, intf) {
        return manager.addName(name, this.name)
            .then(() =>
                node.registerObject(name, obj, intf)
            )
    }

    unregisterObject () {
        //TODO
    }

    request (name, ...args) {
        log.log('request', name, args)
        const [, path, intf, member] = /^([/\d]+)(\w+).(\w+)$/.exec(name)
        return node.request({path, intf, member, args})
            .catch(e => {
                log.error(`request ${name} rejected ${e}`)
                throw e
            })
    }

    signal (name, args) {
        //log.log('signal', name, args)
        const [, path, intf, member] = /^([/\d]+)(\w+).(\w+)$/.exec(name)
        return node.signal({name, path, intf, member, args})
    }

    registerListener (name, cb) {
        //const [, path, intf, member] = /^([/\d]+)(\w+).(\w+)$/.exec(name)
        //TODO
        node.signals.on(name, cb)
    }

    unregisterListener () {
        //TODO
    }

    close () {
        node.close
    }
}

export default new Bus()