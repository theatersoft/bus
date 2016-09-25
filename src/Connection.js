import {default as WebSocket, Server as WebSocketServer} from 'ws'
import EventEmitter from './EventEmitter'
const url = process.env.BUS || 'ws://localhost:5453'

class Connection extends EventEmitter {
    constructor (ws) {
        super()
        this.ws = ws
            .on('open', () =>
                this.emit('open'))
            .on('message', (data, flags) =>
                this.emit('data', JSON.parse(data)))
            .on('close', () =>
                this.emit('close'))
            .on('error', err =>
                this.emit('error', err))
    }

    send (data) {
        //console.log(`connection ${this.name} send`, data)
        this.ws.send(JSON.stringify(data))
    }
}

class Server extends EventEmitter {
    constructor (wss) {
        super()
        wss
            .on('connection', ws => {
                console.log(`new connection to ${ws.upgradeReq.headers.host}`)
                this.emit('connection', new Connection(ws))
            })
            .on('close', (code, msg) =>
                this.emit('close'))
            .on('error', err =>
                this.emit('error', err))
    }
}

let context

export default {
    createParentConnection (parent) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
        return new Connection(new WebSocket(parent.url))
    },

    createServer ({host, port, server}) {
        let options
        if (server) {
            options = {server}
            console.log(`connecting ws server to http server`)
        } else {
            options = {host, port}
            console.log(`starting ws server on ${host}:${port}`)
        }
        return new Server(new WebSocketServer(options))
    },

    create (context = {parent: {url}}) {
        this.context = context
        return this
    },

    set context (value) {
        if (context) throw new Error('Cannot change context')
        context = value
    },

    get context () {
        return context
    }
}
