// @std/esm loader imports named exports
import {bus} from '@theatersoft/bus'

bus.start().then(bus => {
    console.log(`Bus name is ${bus.name}`)

    bus.registerObject('Local', {
        ping: () => console.log('ping')
    }, ['ping'])
})
