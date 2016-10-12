import EventEmitter from './EventEmitter'
import log from 'log'
const url = `${location.protocol ==='https:' ? 'wss' : 'ws'}://${location.host}`

class Connection extends EventEmitter {
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
        log.log(`connection ${this.name} send`, data)
        this.ws.send(JSON.stringify(data))
    }
}

let context

export default {
    create (value = {parent: {url}}) {
        context = value
    },

    get hasParent () {
        if (!context) throw new Error('Invalid bus context')
        return !!context.parent
    },

    get hasChildren () {
        if (!context) throw new Error('Invalid bus context')
        return !!context.children
    },

    createParentConnection () {
        if (!context) throw new Error('Invalid bus context')
        return new Connection(new WebSocket(context.parent.url))
    },

    createServer () {
        if (!context) throw new Error('Invalid bus context')
        throw ('not implemented')
    }
}
