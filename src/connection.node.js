import {default as WebSocket, Server as WebSocketServer} from 'ws'
import EventEmitter from './EventEmitter'
import {childStartup, parentStartup} from './connectionStartup'
import {log} from 'log'

class NodeConnection extends EventEmitter {
    constructor (ws) {
        super()
        this.ws = ws
            .on('open', () =>
                this.emit('open'))
            .on('message', (data, flags) => {
                //log(`connection ${this.name} message`, data)
                this.emit('data', JSON.parse(data))
            })
            .on('close', () =>
                this.emit('close'))
            .on('error', err =>
                this.emit('error', err))
    }

    send (data) {
        //log(`connection ${this.name} send`, data)
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
const defaultUrl = process.env.BUS || 'ws://localhost:5453'
const defaultAuth = process.env.AUTH

export default {
    create (value = {}) {
        const
            {parent: {url, auth} = {}, children: {server, host, port, check} = {}} = value
        return Promise.resolve(auth)
            .then(auth => {
                const
                    children = server || host ? {server, host, port, check} : undefined,
                    parent = url || auth || !children ? {url: url || defaultUrl, auth: auth || defaultAuth} : undefined
                context = {parent, children}
            })
    },

    get context () {
        if (!context) throw new Error('Invalid bus context')
        return context
    },

    get hasParent () {
        return this.context.parent && this.context.parent.url
    },

    get hasChildren () {
        return !!this.context.children
    },

    createParentConnection () {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
        return new ParentConnection(new WebSocket(this.context.parent.url))
    },

    createServer () {
        let options, {host, port, server} = this.context.children
        if (server) {
            options = Promise.resolve(server)
                .then(server => {
                    log(`connecting ws server to http server`)
                    return {server}
                })
        } else {
            options = Promise.resolve({host, port})
            log(`starting ws server on ${host}:${port}`)
        }
        return options
            .then(options =>
                new Server(new WebSocketServer(options)))
    }
}
