'use strict'

const
    Bus = require('bus')

process.on('unhandledRejection', (reason, p) => console.log('unhandled rejection', reason, p))

Bus.connection = require('bus/src/Connection')
Bus.context = {parent: {url: 'ws://localhost:5453'}}
Bus.start().then(bus => {
    bus.registerObject('Local', {
        ping: () => console.log('ping')
    }, ['ping'])

    bus.request('/TestService.addName', bus.name).then(res => {
        console.log('addName returned', res)
    })

    // order guarantee
    bus.request('/TestService.getNames').then(res => {
        console.log('getNames returned', res)
    })

})


