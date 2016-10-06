'use strict'

require('@theatersoft/bus').default
    .start({children: {host: '0.0.0.0', port: 5453}}).then(bus => {
        console.log(`bus name is ${bus.name}`)
        const TestService = require('./TestService')
        bus.registerObject(new TestService(), 'TestService')
    }, err =>
        console.log(err)
)


