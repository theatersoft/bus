'use strict'

const
    Bus = require('bus'),
    connection = require('bus/src/BrowserConnection')

Bus.start(connection).then(bus => {
    console.log(`bus name is ${bus.name}`)

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
