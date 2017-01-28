'use strict'

require('@theatersoft/bus').default
    .start().then(bus => {
    bus.registerObject('Local', {
            ping: () => console.log('ping')
        }, ['ping'])
        .then(obj =>
            obj.signal('fake', `hello from ${bus.name}`))
})
