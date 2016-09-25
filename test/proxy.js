'use strict'

const
    {Bus} = require('bus'),
    testService = Bus.proxy('TestService')

process.on('unhandledRejection', (reason, p) => console.log('unhandled rejection', reason, p))

Bus.start({parent: {url: 'ws://localhost:5453'}}).then(bus => {
    testService.addName(bus.name)
    testService.getNames()
        .then(res => {
            console.log('getNames returned', res)
            process.exit()
        })
})


