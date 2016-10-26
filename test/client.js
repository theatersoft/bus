'use strict'
require('@theatersoft/bus').default.start({
    parent: {auth: 'TODO'}
})
    .then(bus =>
        bus.registerObject('Ping', {
            ping () {
                console.log('Ping.ping')
                return 'ping'
            }
        }, ['ping']))
