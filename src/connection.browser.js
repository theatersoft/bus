import EventEmitter from './EventEmitter'
import {parentStartup} from './connectionStartup'
import log from 'log'

class BrowserConnection extends EventEmitter {
    constructor (ws) {
        super()
        this.ws = ws
        const self = this
        ws.onopen = () =>
            self.emit('open')
        ws.onmessage = ev =>
            self.emit('data', JSON.parse(ev.data))
        ws.onclose = ev => {
            log.log('connection close', this.name)
            self.emit('close')
        }
        ws.onerror = ev =>
            self.emit('error', ev)
    }
    send (data) {
        //log.log(`connection ${this.name} send`, data)
        this.ws.send(JSON.stringify(data))
    }
}

class ParentConnection extends parentStartup(BrowserConnection) {}

let context

export default {
    create (value) {
        const {parent: {url = `${location.protocol ==='https:' ? 'wss' : 'ws'}://${location.host}`, auth} = {}} = value
        return Promise.resolve(auth)
            .then(auth => {
                context = {parent: {url, auth}}
            })
    },

    get context () {
        return context
    },

    get hasParent () {
        if (!context) throw new Error('Invalid bus context')
        return context.parent && context.parent.url
    },

    get hasChildren () {
        if (!context) throw new Error('Invalid bus context')
        return !!context.children
    },

    createParentConnection () {
        if (!context) throw new Error('Invalid bus context')
        return new ParentConnection(new WebSocket(context.parent.url))
    },

    createServer () {
        if (!context) throw new Error('Invalid bus context')
        throw ('not implemented')
    }
}
