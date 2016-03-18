'use strict'

process.on('unhandledRejection', (reason, p) => console.log('unhandled rejection', reason, p))

const
    Bus = require('bus'),
    connection = require('bus/src/Connection')

Bus.start(connection.create({parent: {url: 'ws://localhost:5453'}})).then(bus => {
    bus.registerObject('Local', {
        ping: () => console.log('ping')
    }, ['ping'])

    bus.request('/TestService.addName', bus.name).then(res => {
        console.log('addName returned', res)
    })

    bus.request('/TestService.getNames').then(res => {
        console.log('getNames returned', res)
    })
})


