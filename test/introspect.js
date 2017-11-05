'use strict'
const
    {bus, log, error} = require('@theatersoft/bus'),
    logJson = o => log(JSON.stringify(o, null, 4)),
    start = f => bus.start().then(f),
    tree = async p => {
        const node = await bus.introspectNode(p)
        node.children = await Promise.all(
            node.children.map(name =>
                tree(name)
                    .catch(error => ({name, error}))
            )
        )
        return node
    }

process.on('unhandledRejection', error)

start(async () => logJson(await tree('/')))
