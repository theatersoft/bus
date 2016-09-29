'use strict'

process.on('unhandledRejection', (reason, p) => console.log('unhandled rejection', reason, p))

require('@theatersoft/bus').Bus.start().then(bus => {
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


