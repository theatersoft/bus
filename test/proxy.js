'use strict'

const
    Bus = require('bus'),
    connection = require('bus/src/Connection'),
    testService = Bus.proxy('TestService')

process.on('unhandledRejection', (reason, p) => console.log('unhandled rejection', reason, p))

Bus.start(connection.create()).then(bus => {
    testService.addName(bus.name)
    testService.getNames()
        .then(res => {
            console.log('getNames returned', res)
            process.exit()
        })
})


