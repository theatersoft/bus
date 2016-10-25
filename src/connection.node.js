import {default as WebSocket, Server as WebSocketServer} from 'ws'
import EventEmitter from './EventEmitter'
import {childStartup, parentStartup} from './connectionStartup'
import log from 'log'
const url = process.env.BUS || 'ws://localhost:5453'

class NodeConnection extends EventEmitter {
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
        //log.log(`connection ${this.name} send`, data)
        this.ws.send(JSON.stringify(data))
    }
}

class ChildConnection extends childStartup(NodeConnection) {}
class ParentConnection extends parentStartup(NodeConnection) {}

class Server extends EventEmitter {
    constructor (wss) {
        super()
        wss
            .on('connection', ws => {
                //log.log(`new connection to ${ws.upgradeReq.headers.host}`)
                const child = new ChildConnection(ws)
                    .on('connect', () => {
                        this.emit('child', child)
                    })
            })
            .on('close', (code, msg) =>
                this.emit('close'))
            .on('error', err =>
                this.emit('error', err))
    }
}

let context

export default {
    create (value = {parent: {url}}) {
        context = value
    },

    get context () {
        return context
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
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
        return new ParentConnection(new WebSocket(context.parent.url))
    },

    createServer () {
        if (!context) throw new Error('Invalid bus context')
        let options, {host, port, server} = context.children
        if (server) {
            options = {server}
            log.log(`connecting ws server to http server`)
        } else {
            options = {host, port}
            log.log(`starting ws server on ${host}:${port}`)
        }
        return new Server(new WebSocketServer(options))
    }
}
