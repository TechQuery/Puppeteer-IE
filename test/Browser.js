'use strict';

require('should');

const Browser = require('../source/Browser');

const browser = new Browser(
    process.env.npm_config_argv.indexOf('--inspect')  <  0
);

const exit = browser.close.bind( browser );

for (let event  of  ['uncaughtException', 'unhandledRejection', 'SIGINT', 'exit'])
    process.on(event, exit);


describe('Browser',  function () {

    it('.prototype.pages()',  async function () {

        await browser.newPage();

        (await browser.pages()).length.should.be.equal( 1 );
    });

    it('.prototype.close()',  async function () {

        await browser.close();

        (await browser.pages()).should.be.eql( [ ] );
    });
});
