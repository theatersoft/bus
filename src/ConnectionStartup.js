import log from 'log'

const ConnectionStartup = ConnectionBase => {
    // fix TypeError in arrow function without braces returning a function
    // https://github.com/rollup/rollup/pull/1062
    return class extends ConnectionBase {
        constructor (...args) {
            super(...args)
            this.on('data', ({hello}) => {
                log.log('ConnectionStartup hello', hello)
                if (hello) {
                    this.name = `${hello}0`
                    this.emit('connect', hello)
                }
            })
        }

        hello () {
        }
    }
}

export default ConnectionStartup