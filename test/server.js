'use strict'

const
    bus = require('@theatersoft/bus').default,
    http = require('http'),
    {port} = require('url').parse(process.env.BUS || 'ws://localhost:5453'),
    express = require('express'),
    app = express()

app.use('/', express.static(`${__dirname}/pub`))
const server = http.createServer(app).listen(port);
console.log('Listening on port ' + port)

bus.start({
    children: {
        server,
        //check (auth) {
        //    console.log('check', auth)
        //    return Promise.resolve(true)
        //}
    }
})
