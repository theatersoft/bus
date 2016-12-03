'use strict'
require('shelljs/make')

const
    DIST = process.env.DIST === 'true',
    path = require('path'),
    fs = require('fs'),
    copyright = `/*\n${fs.readFileSync('COPYRIGHT', 'utf8')}\n */`,
    rollup = require('rollup'),
    babel = DIST && require('rollup-plugin-babel')({
            babelrc: false,
            //exclude: 'node_modules/**',
            comments: false,
            minified: true,
            //presets: [babili],
            plugins: [
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
            ]
        }),
    alias = require('rollup-plugin-alias'),
    aliases = ar => alias(ar.reduce((o, a) => {
        o[a.match(/^\.\/([^\.]+)\./)[1]] = a
        return o
    }, {
        resolve: ['.js']
    })),
    strip = DIST && require('rollup-plugin-strip')({
            functions: ['log', 'debug']
        })

    target.browser = function () {
    console.log('target browser')
    return rollup.rollup({
            entry: 'src/bundle.js',
            plugins: [
                aliases(['./log.browser' , './connection.browser']),
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
}

target.node = function () {
    console.log('target node')
    return rollup.rollup({
            entry: 'src/bundle.js',
            external: ['ws', 'util'],
            plugins: [
                aliases(['./log.node' , './connection.node']),
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
}

target['browser-es'] = function () {
    console.log('target browser-es')
    return rollup.rollup({
            entry: 'src/bundle.js',
            plugins: [
                aliases(['./log.browser' , './connection.browser']),
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
}

target.clean = function () {
    console.log('target clean')
    exec('mkdir -p dist; rm -f dist/*')
}

target.package = function () {
    console.log('target package')
    const filters = ['devDependencies', 'scripts'].concat(DIST ? ['private'] : [])
    const p = Object.entries(require('./package.json')).reduce((o, [k, v]) => {
        if (!filters.includes(k)) o[k] = v
        return o
    }, {})
    p.scripts = {start: 'node start.js'}
    fs.writeFileSync('dist/package.json', JSON.stringify(p, null, '  '), 'utf-8')
    exec('sed -i "s|dist/||g" dist/package.json ')
    exec('cp LICENSE start.js dist')
}

target.client = function () {
    console.log('target client')
    exec('cd test; ../node_modules/.bin/browserify client.js -d -v -o pub/test.js')
}

target.publish = function () {
    console.log('target publish')
    exec('npm publish --access=public dist')
}

target.all = function () {
    target.clean()
    target.browser()
    target['browser-es']()
    target.node()
    target.package()
}