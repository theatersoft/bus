'use strict'

const
    {Bus} = require('@theatersoft/bus'),
    testService = Bus.proxy('TestService')

Bus.start({parent: {url: 'ws://localhost:5453'}}).then(bus => {
    testService.addName(bus.name)
    testService.getNames()
        .then(res => {
            console.log('getNames returned', res)
            process.exit()
        })
})


