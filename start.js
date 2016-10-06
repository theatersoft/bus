'use strict'

const
    Bus = require('@theatersoft/bus').default,
    {port} = require('url').parse(process.env.BUS || 'ws://localhost:5453')

console.log('Listening on port ' + port)

Bus.start({children: {host: '0.0.0.0', port}}).then(bus => {})


