'use strict'

const
    Bus = require('./src/Bus'),
    TestService = require('./TestService')

process.on('unhandledRejection', (reason, p) =>
    console.log('unhandled rejection', reason, p))

Bus.connection = require('./src/Connection')
Bus.context = {children: {host: '0.0.0.0', port:5453}}
Bus.start().then(bus => {
    console.log(`bus name is ${bus.name}`)

    bus.registerObject(new TestService(), 'TestService')
}, err =>
    console.log(err)
)


