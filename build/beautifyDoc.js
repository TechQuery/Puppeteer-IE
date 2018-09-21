#! /usr/bin/env node

const { readFile, writeFile } = require('fs-extra');

const FS_match = require('fs-match'), Beautify = require('js-beautify').html;


console.log();

console.time('Beautify-Doc');

Promise.all(
    FS_match('.*\\.html',  process.argv[2] || '.').map(async function (file) {

        console.log(file = file.trim());

        const code = await readFile( file );

        return  await writeFile(
            file,  Beautify(code.toString('utf-8'),  {'max-preserve-newlines': 3})
        );
    })
).then( console.timeEnd.bind(console, 'Beautify-Doc') );
