'use strict'
require('shelljs/make')

const
    pkg = require('./package.json'),
    DIST = process.env.DIST === 'true',
    path = require('path'),
    fs = require('fs'),
    copyright = `/*\n${fs.readFileSync('COPYRIGHT', 'utf8')}\n */`,
    rollup = require('rollup'),
    babel = require('rollup-plugin-babel')({
        babelrc: false,
        comments: !DIST,
        minified: DIST,
        //presets: [babili],
        plugins: [
            //require("babel-plugin-transform-decorators-legacy").default,
            [require("babel-plugin-transform-object-rest-spread"), {useBuiltIns: true}]
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
    strip = DIST && require('rollup-plugin-strip')({
            functions: ['log']
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
        const p = Object.assign({}, pkg, {
            private: !DIST,
            dependencies: pkg.distDependencies,
            distDependencies: undefined,
            devDependencies: undefined,
            scripts: pkg.distScripts,
            distScripts: undefined
        })
        fs.writeFileSync('dist/package.json', JSON.stringify(p, null, '  '), 'utf-8')
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

    async all () {
        await target.browser()
        await target['browser-es']()
        await target.node()
        target.package()
    }
}

Object.assign(target, targets)