'use strict'

process.on('unhandledRejection', (reason, p) => console.log('unhandled rejection', reason, p))

require('@theatersoft/bus').Bus
    .start()
    .then(bus => {
        bus.registerListener('/Hvac.data', data => {
            console.log('/Hvac.data', data)
        })
        bus.registerListener('/x10.rx', data => {
            console.log('/x10.rx', data)
        })
    })