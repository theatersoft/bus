'use strict'

require('@theatersoft/bus').default.start()
    .then(bus => {
        bus.registerListener('/Hvac.data', data => {
            console.log('/Hvac.data', data)
        })
        bus.registerListener('/x10.rx', data => {
            console.log('/x10.rx', data)
        })
    })