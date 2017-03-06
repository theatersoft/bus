'use strict'

const
    {bus, log} = require('@theatersoft/bus')

bus.start()
    .then(() => bus.registerObject('Ping', new class Ping {
        ping () {
            log('Ping.ping')
            return 'ping'
        }
        fail () {
            log('Ping.fail')
            throw 'fail'
        }
    }))
