import log from 'log'

export function ParentConnectionStartup (ConnectionBase) {
    // fix TypeError in arrow function without braces returning a function
    // https://github.com/rollup/rollup/pull/1062
    return class extends ConnectionBase {
        constructor (...args) {
            super(...args)
            const onhello = ({hello}) => {
                log.log('ConnectionStartup hello', hello)
                if (hello) {
                    this.name = `${hello}0`
                    this.emit('connect', hello)
                    this.off('data', onhello)
                }
            }
            this.on('data', onhello)
        }
    }
}

export function ChildConnectionStartup (ConnectionBase) {
    return class extends ConnectionBase {
        hello () {
        }
    }
}