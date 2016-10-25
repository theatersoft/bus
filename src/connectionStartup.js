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
                        log.log('parentStartup onhello', hello)
                        this.name = `${hello}0`
                        this.emit('connect', hello)
                        this.off('data', onhello)
                    }
                },
                onauth = ({auth}) => {
                    log.log('parentStartup onauth', auth)
                    this.send({auth: AUTH})
                    this.off('data', onauth)
                    this.on('data', onhello)
                },
                {parent: {auth: AUTH}} = connection.context
            AUTH ? this.on('data', onauth) : this.on('data', onhello)
            log.log('parentStartup auth', AUTH)
        }
    }
}

export function childStartup (ConnectionBase) {
    return class extends ConnectionBase {
        constructor (...args) {
            super(...args)
            const {children: {check} = {}} = connection.context
            log.log('childStartup auth check', !!check)
            setImmediate(() => {
                if (!check)
                    this.emit('connect')
                else {
                    const
                        onauth = ({auth}) => {
                            log.log('childStartup onauth', auth)
                            check(auth)
                                .then(valid => {
                                    if (valid) {
                                        this.emit('connect')
                                    }
                                    else {
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
}