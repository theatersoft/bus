'use strict'
const
    {bus, proxy, log, error, setTime, setTag} = require('@theatersoft/bus')

process.on('unhandledRejection', error)
setTime(true)

bus.start()
    .then(async bus => {
        log(await bus.introspectNode('/'))
    })
