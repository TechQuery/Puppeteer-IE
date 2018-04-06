'use strict';

require('should');

const Page = require('../source/Page');

const page = new Page(
    process.env.npm_config_argv.indexOf('--inspect')  <  0
);

const exit = page.close.bind( page );

for (let event  of  ['uncaughtException', 'unhandledRejection', 'SIGINT', 'exit'])
    process.on(event, exit);


describe('Page',  function () {

    before( page.goto.bind(page,  process.env.npm_package_homepage) );


    describe('Property',  function () {

        it('Title',  function () {

            return  page.title().should.be.fulfilledWith('Home - Documentation');
        });

        it('URL',  function () {

            page.url().should.be.equal( process.env.npm_package_homepage );
        });
    });

    describe('Selector',  function () {

        it('.prototype.$()',  async function () {

            (await page.$('a')).textContent.should.be.equal('Home');
        });

        it('.prototype.$$()',  async function () {

            const list = (await page.$$('h2 a')).map(link => link.textContent);

            list.should.be.eql( ['Home'] );
        });
    });

    it('Viewport',  async function () {

        await page.setViewport({width: 1024,  height: 768});

        (await page.viewport()).should.be.eql({
            width:                1024,
            height:               768,
            deviceScaleFactor:    1,
            isMobile:             false,
            hasTouch:             false,
            isLandscape:          true
        });
    });

    describe('Injection',  function () {

        it('.prototype.addStyleTag()',  async function () {

            await page.addStyleTag({
                content:    'body { color: blue; }'
            });

            (await page.evaluate('getComputedStyle( document.body ).color'))
                .should.be.equal('rgb(0, 0, 255)');
        });

        it('.prototype.addScriptTag()',  async function () {

            await page.addScriptTag({
                content:    'self.__test__ = "Test";'
            });

            (await page.evaluate('self.__test__')).should.be.equal('Test');
        });
    });

    describe('.prototype.evaluate()',  function () {

        it('Expression',  function () {

            return page.evaluate('document.title')
                .should.be.fulfilledWith('Home - Documentation');
        });

        it('Function',  function () {

            return page.evaluate(function () {

                return document.title;

            }).should.be.fulfilledWith('Home - Documentation');
        });

        it('Function with parameter',  function () {

            return page.evaluate(function (name, version) {

                return document.title + ' - ' + name + ' ' + version;

            }, 'IE', 11).should.be.fulfilledWith('Home - Documentation - IE 11');
        });
    });

    describe('Event',  function () {

        it('.prototype.click()',  async function () {

            await page.click('a');

            await page.waitForNavigation();

            page.url().should.be.equal(process.env.npm_package_homepage  +  'index.html');
        });

        it('.prototype.focus()',  async function () {

            await page.focus('a');

            (await page.evaluate('document.activeElement.textContent')).should.be.equal('Home');
        });

        it('.prototype.type()',  async function () {

            const input = await page.$('h1');

            input.setAttribute('contentEditable', true);

            await page.type('h1', ', Hello!');

            input.innerText.should.be.equal('Puppeteer-IE, Hello!');
        });
    });

    describe('Navigator',  function () {

        it('.prototype.reload()',  async function () {

            await page.reload();

            (await page.$('h1')).innerText.should.be.equal('Puppeteer-IE');
        });

        it('.prototype.goBack()',  async function () {

            await page.goBack();

            page.url().should.be.equal( process.env.npm_package_homepage );
        });

        it('.prototype.goForward()',  async function () {

            await page.goForward();

            page.url().should.be.equal(process.env.npm_package_homepage  +  'index.html');
        });
    });
});
