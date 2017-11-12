import connection from 'connection'
import {debug, log, error} from './log'
import type {Connection} from 'connection'

export const parentStartup = (ConnectionBase:Connection) => class extends ConnectionBase {
    constructor (...args:mixed[]) {
        super(...args)
        debug('parentStartup context', connection.context.parent)
        const
            {parent: {auth}} = connection.context,
            onhello = ({hello}) => {
                if (hello) {
                    debug('parentStartup onhello', hello)
                    this.name = `${hello}0`
                    this.emit('connect', hello)
                    this.off('data', onhello)
                }
            },
            onauth = ({auth: _auth}) => {
                debug('parentStartup onauth', _auth)
                this.send({auth})
                this.off('data', onauth)
                this.on('data', onhello)
            }
        this.on('data', auth ? onauth : onhello)
        debug('parentStartup auth', auth && '******')
    }
}

export const childStartup = (ConnectionBase:Connection) => class extends ConnectionBase {
    constructor (...args:mixed[]) {
        super(...args)
        const {children: {check} = {}} = connection.context
        debug('childStartup context', connection.context.children)
        Promise.resolve().then(() => {
            if (!check)
                this.emit('connect')
            else {
                const
                    onauth = ({auth}) => {
                        debug('childStartup onauth', auth)
                        check(auth)
                            .then(valid => {
                                if (valid) {
                                    debug('childStartup check passed', auth)
                                    this.emit('connect')
                                }
                                else {
                                    error('childStartup check failed', auth)
                                    // close
                                }
                                this.off('data', onauth)
                            })
                    }
                this.on('data', onauth)
                this.send({auth: ''})
            }
        })
    }

    hello () {
        this.send({hello: `${this.name}/`})
    }
}
