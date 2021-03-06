import EventEmitter from './EventEmitter'
import {parentStartup} from './connectionStartup'
import {log} from './log'
import type {Context, ParentContext, Connection} from './types'

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
            log('connection close', this.name)
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

let context :ParentContext

export default {
    create (value :ParentContext) :Promise<void> {
        const defaultUrl = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`
        const {parent: {url = defaultUrl, auth}} = value
        return Promise.resolve(auth)
            .then(auth => {
                context = {parent: {url, auth}}
            })
    },

    get context () :ParentContext {
        if (!context) throw new Error('Invalid bus context')
        return context
    },

    get hasParent () :boolean {
        return this.context.parent && this.context.parent.url
    },

    get hasChildren () :boolean {
        return !!this.context.children
    },

    createParentConnection () :Connection {
        return new ParentConnection(new WebSocket(this.context.parent.url))
    },

    createServer () {
        throw ('not implemented')
    }
}

export const type = 'browser'
