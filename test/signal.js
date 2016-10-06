'use strict'

require('@theatersoft/bus').default
    .start().then(bus => {
    bus.registerObject('Local', {
        ping: () => console.log('ping')
    }, ['ping'])

    bus.signal('/Fake.fake', `hello from ${bus.name}`)
})


