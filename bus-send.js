'use strict'

const
    Bus = require('./src/Bus'),
    argv = require('minimist')(process.argv.slice(2), {
        string: [
            'url',
            'name',
            'values'
        ],
        default: {
            url: 'ws://localhost:5453'
        }
    })

//

if (!argv.name) {
    console.log('Error: missing --name [/path]/[Interface.method]')
    process.exit()
}

Bus.connection = require('./src/Connection')
Bus.context = {parent: {url: argv.url}}
Bus.start()
    .then(bus => {
        bus.request(argv.name, argv.values).then(res => {
            console.log('returned', res)
            process.exit()
        })
    })


