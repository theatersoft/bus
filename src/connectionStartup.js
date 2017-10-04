import connection from 'connection'
import {log, error} from './log'

export const parentStartup = ConnectionBase => class extends ConnectionBase {
    constructor (...args) {
        super(...args)
        const
            {parent: {auth}} = connection.context,
            onhello = ({hello}) => {
                if (hello) {
                    //log('parentStartup onhello', hello)
                    this.name = `${hello}0`
                    this.emit('connect', hello)
                    this.off('data', onhello)
                }
            },
            onauth = ({auth: _auth}) => {
                //log('parentStartup onauth', _auth)
                this.send({auth})
                this.off('data', onauth)
                this.on('data', onhello)
            }
        this.on('data', auth ? onauth : onhello)
        //log('parentStartup auth', auth && '******')
    }
}

export const childStartup = ConnectionBase => class extends ConnectionBase {
    constructor (...args) {
        super(...args)
        const {children: {check} = {}} = connection.context
        log('childStartup auth check', !!check)
        Promise.resolve().then(() => {
            if (!check)
                this.emit('connect')
            else {
                const
                    onauth = ({auth}) => {
                        log('childStartup onauth', auth)
                        check(auth)
                            .then(valid => {
                                if (valid) {
                                    log('childStartup check passed', auth)
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
