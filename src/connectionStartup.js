import connection from 'connection'
import log from 'log'

export function parentStartup (ConnectionBase) {
    // fix TypeError in arrow function without braces returning a function
    // https://github.com/rollup/rollup/pull/1062
    return class extends ConnectionBase {
        constructor (...args) {
            super(...args)
            const
                onhello = ({hello}) => {
                    if (hello) {
                        log.log('parentStartup hello', hello)
                        this.name = `${hello}0`
                        this.emit('connect', hello)
                        this.off('data', onhello)
                    }
                },
                onauth = ({auth}) => {
                    log.log('parentStartup auth', auth)
                    this.send({auth: 'response'})
                    this.off('data', onauth)
                }
            this.on('data', onhello)
            this.on('data', onauth)
        }
    }
}

const
    authenticate =
        // connection.context
        true // TEST

export function childStartup (ConnectionBase) {
    return class extends ConnectionBase {
        constructor (...args) {
            super(...args)
            log.log('childStartup', authenticate)
            setImmediate(() => {
                if (!authenticate)
                    this.emit('connect')
                else {
                    const
                        onauth = ({auth}) => {
                            log.log('childStartup auth', auth)
                            // TODO check child auth
                            this.off('data', onauth)
                            this.emit('connect')
                        }
                    this.on('data', onauth)
                    this.send({auth: 'request'})
                }
            })
        }

        hello () {
            this.send({hello: `${this.name}/`})
        }
    }
}