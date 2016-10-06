'use strict'

const
    {default: bus, proxy} = require('@theatersoft/bus'),
    testService = proxy('TestService')

bus.start({parent: {url: 'ws://localhost:5453'}}).then(() => {
    testService.addName(bus.name)
    testService.getNames()
        .then(res => {
            console.log('getNames returned', res)
            process.exit()
        })
})


