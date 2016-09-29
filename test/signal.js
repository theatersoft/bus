'use strict'

process.on('unhandledRejection', (reason, p) => console.log('unhandled rejection', reason, p))

const
    {Bus} = require('@theatersoft/bus')

Bus.start({parent: {url: 'ws://localhost:5453'}}).then(bus => {
    bus.registerObject('Local', {
        ping: () => console.log('ping')
    }, ['ping'])

    bus.signal('/Fake.fake', `hello from ${bus.name}`)
})


