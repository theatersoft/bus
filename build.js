'use strict'
require('shelljs/make')

const
    path = require('path'),
    fs = require('fs'),
    rollup = require('rollup'),
    babel = require('rollup-plugin-babel'),
    //babili = require('babel-preset-babili'),
    copyright = `/*
 Copyright (C) 2016 Theatersoft

 This program is free software: you can redistribute it and/or modify it under
 the terms of the GNU Affero General Public License as published by the Free
 Software Foundation, version 3.

 This program is distributed in the hope that it will be useful, but WITHOUT
 ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more
 details.

 You should have received a copy of the GNU Affero General Public License along
 with this program. If not, see <http://www.gnu.org/licenses/>
  */`,
    execo = c => exec(c, {silent: true}).trim(),
    liftUndefined = x => x === 'undefined' ? undefined : x,
    getVar = n => liftUndefined(execo('npm config get bus:' + n)),
    DIST = getVar('dist') === 'true',
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

// https://github.com/rollup/rollup/wiki/JavaScript-API

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
    if (!DIST) return console.log('skipped')
    const p = Object.entries(require('./package.json')).reduce((o, [k, v]) => {
        if (!['private', 'devDependencies', 'scripts'].includes(k)) o[k] = v
        return o
    }, {})
    fs.writeFileSync('dist/package.json', JSON.stringify(p, null, '  '), 'utf-8')
    exec('sed -i "s|dist/||g" dist/package.json ')
    exec('cp LICENSE dist')
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
    //target.client()
    target.package()
}