'use strict'
require('shelljs/make')

const
    path = require('path'),
    fs = require('fs'),
    rollup = require('rollup'),
    babel = require('rollup-plugin-babel'),
    copyright = `/*\n${fs.readFileSync('COPYRIGHT', 'utf8')}\n */`,
    DIST = process.env.DIST === 'true',
    plugins = DIST && [
        babel({
            babelrc: false,
            //exclude: 'node_modules/**',
            comments: false,
            minified: true,
            //presets: [babili],
            plugins: [
                require("babel-plugin-minify-constant-folding"),
                require("babel-plugin-minify-dead-code-elimination"),
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
        })
    ]

target.browser = function () {
    console.log('target browser')
    rollup.rollup({
            entry: 'src/bundle.browser.js',
            plugins
        })
        .then(bundle => {
            bundle.write({
                dest: 'dist/bus.browser.js',
                format: 'umd',
                moduleName: 'bus',
                banner: copyright,
                sourceMap: DIST ? false : 'inline'
            })
        })
}

target.node = function () {
    console.log('target node')
    rollup.rollup({
            entry: 'src/bundle.js',
            external: ['ws'],
            plugins
        })
        .then(bundle => {
            bundle.write({
                dest: 'dist/bus.js',
                format: 'cjs',
                moduleName: 'bus',
                banner: copyright,
                sourceMap: DIST ? false : 'inline'
            })
        })
}

target['browser-es'] = function () {
    console.log('target browser-es')
    rollup.rollup({
            entry: 'src/bundle.browser.js'
        })
        .then(bundle => {
            bundle.write({
                dest: 'dist/bus.browser.mjs',
                format: 'es',
                moduleName: 'bus',
                banner: copyright,
                sourceMap: DIST ? false : 'inline'
            })
        })
}

target['node-es'] = function () {
    console.log('target node-es')
    rollup.rollup({
            entry: 'src/bundle.js',
            external: ['ws']
        })
        .then(bundle => {
            bundle.write({
                dest: 'dist/bus.mjs',
                format: 'es',
                moduleName: 'bus',
                banner: copyright,
                sourceMap: DIST ? false : 'inline'
            })
        })
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
    //target['browser-es']()
    target.node()
    //target['node-es']()
    target.package()
}