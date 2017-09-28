// ESM loader can only load default export
import _bus from '@theatersoft/bus'
const bus = _bus.bus

bus.start().then(bus => {
    console.log(`Bus name is ${bus.name}`)

    bus.registerObject('Local', {
        ping: () => console.log('ping')
    }, ['ping'])
})
