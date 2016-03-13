'use strict'

const
    Bus = require('bus'),
    testService = Bus.proxy('TestService')

process.on('unhandledRejection', (reason, p) => console.log('unhandled rejection', reason, p))

Bus.connection = require('bus/src/Connection')
Bus.context = {parent: {url: 'ws://localhost:5453'}}
Bus.start().then(bus => {
    testService.addName(bus.name)
    testService.getNames()
        .then(res => {
            console.log('getNames returned', res)
            process.exit()
        })
})


