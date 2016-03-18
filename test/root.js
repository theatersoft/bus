'use strict'

process.on('unhandledRejection', (reason, p) => console.log('unhandled rejection', reason, p))

const
    Bus = require('bus'),
    connection = require('bus/src/Connection')

Bus.start(connection.create({children: {host: '0.0.0.0', port:5453}})).then(bus => {
    console.log(`bus name is ${bus.name}`)
    const TestService = require('./TestService')
    bus.registerObject(new TestService(), 'TestService')
}, err =>
    console.log(err)
)


