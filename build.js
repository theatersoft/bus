'use strict'
require('shelljs/make')

const
    path = require('path'),
    fs = require('fs'),
    rollup = require('rollup'),
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
  */`

// https://github.com/rollup/rollup/wiki/JavaScript-API

target.browser = function () {
    console.log('target browser')
    rollup.rollup({
            entry: 'src/bundle.browser.js'
        })
        .then(bundle => {
            bundle.write({
                dest: 'dist/bus.browser.js',
                format: 'umd',
                exports: 'named',
                moduleName: 'bus',
                banner: copyright,
                sourceMap: 'inline'
            })
        })
}

target.node = function () {
    console.log('target node')
    rollup.rollup({
            entry: 'src/bundle.js',
            external: ['ws']
        })
        .then(bundle => {
            bundle.write({
                dest: 'dist/bus.js',
                format: 'cjs',
                exports: 'named',
                moduleName: 'bus',
                banner: copyright,
                sourceMap: 'inline',
            })
        })
}

target.client = function () {
    console.log('target client')
    exec('cd test; ../node_modules/.bin/browserify client.js -d -v -o pub/test.js')
}

target.all = function () {
    target.browser()
    target.node()
    target.client()
}