import EventEmitter from './EventEmitter'
import node from './node'
import manager from './manager'
import {proxy} from './proxy'
import Connection from 'Connection'
import log from 'log'

let started

class Bus extends EventEmitter {
    start (context) {
        return started || (started = new Promise((resolve, reject) => {
            Connection.create(context)
                if (Connection.hasParent) {
                    const conn = Connection.createParentConnection()
                        .on('open', () => {
                            log.log('parent open')
                        })
                        .on('connect', name => {
                            this.name = name
                            node.init(conn)
                            resolve(this)
                        })
                        .on('error', err => {
                            log.error('parent error', err)
                            reject(err)
                        })
                } else {
                    this.name = '/'
                    node.init()
                    resolve(this)
                }
            }))
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