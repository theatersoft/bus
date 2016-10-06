'use strict'

require('@theatersoft/bus').default.start().then(bus => {
    console.log(`bus name is ${bus.name}`)

    bus.registerObject('Local', {
        ping: () => console.log('ping')
    }, ['ping'])
})
