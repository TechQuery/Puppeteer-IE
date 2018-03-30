#! /usr/bin/env node

const FS = require('fs-extra');

const FS_match = require('fs-match'), Beautify = require('js-beautify').html;


console.log();

console.time('Beautify-Doc');

Promise.all(
    FS_match('.*\\.html',  process.argv[2] || '.').map(async function (file) {

        console.log(file = file.trim());

        const code = await FS.readFile( file );

        return  await FS.writeFile(
            file,  Beautify(code.toString('utf-8'),  {'max-preserve-newlines': 3})
        );
    })
).then( console.timeEnd.bind(console, 'Beautify-Doc') );
