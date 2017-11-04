'use strict'
const
    {bus, proxy, log, error, setTime, setTag} = require('@theatersoft/bus'),
    run = f => bus.start().then(f)

process.on('unhandledRejection', error)
setTime(true)

const tree = async p => {
    const node = await bus.introspectNode(p)
    node.children = await Promise.all(
        node.children.map(name =>
            tree(name)
                .catch(error => ({name, error}))
        )
    )
    return node
}

run(async () => log(JSON.stringify(await tree('/'), null, 4)))
