'use strict'
require('shelljs/make')
process.on('unhandledRejection', e => console.log(e))

const
    pkg = require('./package.json'),
    DIST = process.env.DIST === 'true',
    DEBUG = process.env.DEBUG === 'true',
    path = require('path'),
    fs = require('fs'),
    writeJson = (file, json) => fs.writeFileSync(file, JSON.stringify(json, null, '  '), 'utf-8'),
    copyright = `/*\n${fs.readFileSync('COPYRIGHT', 'utf8')}\n */`,
    rollup = require('rollup'),
    babel = require('rollup-plugin-babel')({
        babelrc: false,
        comments: !DIST,
        minified: DIST,
        plugins: [
            //require("babel-plugin-transform-decorators-legacy").default,
            [require("babel-plugin-transform-object-rest-spread"), {useBuiltIns: true}],
            require("babel-plugin-transform-flow-comments"),
            require("babel-plugin-transform-class-properties")
        ].concat(DIST ? [
            require("babel-plugin-minify-constant-folding"),
            //FAIL require("babel-plugin-minify-dead-code-elimination"), // es build unusable
            require("babel-plugin-minify-flip-comparisons"),
            require("babel-plugin-minify-guarded-expressions"),
            require("babel-plugin-minify-infinity"),
            require("babel-plugin-minify-mangle-names"),
            require("babel-plugin-minify-replace"),
            //FAIL require("babel-plugin-minify-simplify"),
            require("babel-plugin-minify-type-constructors"),
            require("babel-plugin-transform-member-expression-literals"),
            require("babel-plugin-transform-merge-sibling-variables"),
            require("babel-plugin-transform-minify-booleans"),
            require("babel-plugin-transform-property-literals"),
            require("babel-plugin-transform-simplify-comparison-operators"),
            require("babel-plugin-transform-undefined-to-void")
        ] : [])
    }),
    alias = require('rollup-plugin-alias'),
    aliases = ar => alias(ar.reduce(
        (o, a) => (o[a.match(/^\.\/([^\.]+)\./)[1]] = a, o),
        {resolve: ['.js']}
    )),
    strip = !DEBUG && require('rollup-plugin-strip')({
            functions: DIST ? ['log', 'debug'] : ['debug']
        })

const targets = {
    browser () {
        console.log('target browser')
        return rollup.rollup({
                entry: 'src/index.js',
                plugins: [
                    aliases(['./log.browser', './connection.browser']),
                    babel,
                    strip
                ]
            })
            .then(bundle =>
                bundle.write({
                    dest: 'dist/bus.browser.js',
                    format: 'umd',
                    moduleName: 'bus',
                    banner: copyright,
                    sourceMap: DIST ? false : 'inline'
                }))
    },

    node () {
        console.log('target node')
        return rollup.rollup({
                entry: 'src/index.js',
                external: ['ws', 'util'],
                plugins: [
                    aliases(['./log.node', './connection.node']),
                    babel,
                    strip
                ]
            })
            .then(bundle =>
                bundle.write({
                    dest: 'dist/bus.js',
                    format: 'cjs',
                    moduleName: 'bus',
                    banner: copyright,
                    sourceMap: DIST ? false : 'inline'
                }))
    },

    'browser-es' () {
        console.log('target browser-es')
        return rollup.rollup({
                entry: 'src/index.js',
                plugins: [
                    aliases(['./log.browser', './connection.browser']),
                    babel,
                    strip
                ]
            })
            .then(bundle =>
                bundle.write({
                    dest: 'dist/bus.browser.es.js',
                    format: 'es',
                    moduleName: 'bus',
                    banner: copyright,
                    sourceMap: !DIST // bus sourcemap must be file to passthrough rollup consumers
                }))
    },

    package () {
        console.log('target package')
        writeJson('dist/package.json', Object.assign({}, pkg, {private: !DIST, dist: undefined}, pkg.dist))
        exec('cp LICENSE README.md start.js .npmignore dist')
    },

    client () {
        console.log('target client')
        exec('cd test; ../node_modules/.bin/browserify client.js -d -v -o pub/test.js')
    },

    publish () {
        console.log('target publish')
        exec('npm publish --access=public dist')
    },

    async watch () {
        await targets.all()
        require('chokidar').watch([
                'src'
            ])
            .on('change', path => {
                console.log(new Date().toLocaleTimeString(), path)
                targets.all()
            })
            .on('error', e => console.log(e))
    },

    flow () {
        try {exec('flow status')} catch (e) {}
        require('chokidar').watch([
                'src'
            ])
            .on('change', path => {
                console.log('\n\n\n\n\n\n----',  new Date().toLocaleTimeString(), '----\n')
                try {exec('flow status')} catch (e) {}
            })
            .on('error', e => console.log(e))
    },

    async all () {
        try {
            await targets.browser()
            await targets['browser-es']()
            await targets.node()
            targets.package()
        }
        catch (e) {
            console.log(e)
        }
    }
}

Object.assign(target, targets)