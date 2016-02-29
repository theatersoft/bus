'use strict'

const
    WebSocket = require('ws'),
    WebSocketServer = require('ws').Server,
    EventEmitter = require('./EventEmitter')

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
        console.log(`connection ${this.name} send`, data)
        this.ws.send(JSON.stringify(data))
    }
}

class Server extends EventEmitter {
    constructor (wss) {
        super()
        const self = this
        wss
            .on('connection', ws => {
                console.log(`new connection to ${ws.upgradeReq.headers.host}`)
                self.emit('connection', new Connection(ws))
            })
            .on('close', (code, msg) =>
                self.emit('close'))
            .on('error', err =>
                self.emit('error', err))
    }
}

module.exports = {
    createParentConnection: function (parent) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

        return new Connection(new WebSocket(parent.url))
    },
    createServer: function ({host, port, server}) {
        if (server)
            console.log(`connecting ws server to http server`)
        else
            console.log(`starting ws server on ${host}:${port}`)

        let wss = new WebSocketServer(server ? {server} : {host, port})
        return new Server(wss)
    }
}
