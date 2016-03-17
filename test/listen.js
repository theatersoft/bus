'use strict'

const Bus = require('bus')

process.on('unhandledRejection', (reason, p) => console.log('unhandled rejection', reason, p))

Bus.connection = require('bus/src/Connection')
Bus.context = {parent: {url: 'ws://localhost:5453'}}
Bus.start().then(bus => {
    bus.registerListener('/Fake.fake', data => {
        console.log('/Fake.fake signal', data)
    })
})


