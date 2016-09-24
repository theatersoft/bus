import EventEmitter from './EventEmitter'

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
            console.log('connection close', this.name)
            self.emit('close')
        }
        ws.onerror = ev =>
            self.emit('error', ev)
    }
    send (data) {
        console.log(`connection ${this.name} send`, data)
        this.ws.send(JSON.stringify(data))
    }
}

let context

export default {
    createParentConnection (parent) {
        return new Connection(new WebSocket(parent.url))
    },
    createServer ({host, port, server}) {
        throw ('not implemented')
    },
    create (context) {
        this.context = context
        return this
    },
    set context (value) {
        if (context) throw new Error('Cannot change context')
        context = value
    },
    get context () {
        return context || {parent: {url: `${location.protocol ==='https:' ? 'wss' : 'ws'}://${location.host}`}}
    }
}
