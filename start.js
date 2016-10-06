'use strict'

const
    bus = require('@theatersoft/bus').default,
    {port} = require('url').parse(process.env.BUS || 'ws://localhost:5453')

console.log('Listening on port ' + port)

bus.start({children: {host: '0.0.0.0', port}})


