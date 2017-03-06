'use strict'

const
    {bus} = require('@theatersoft/bus'),
    {port} = require('url').parse(process.env.BUS || 'ws::5453')

bus.start({children: {host: '0.0.0.0', port}})


