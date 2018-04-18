'use strict';

require('should');

const Page = require('../source/Page'), Crypto = require('crypto'), FS = require('fs');

const page = new Page(
    process.env.npm_config_argv.indexOf('--inspect')  <  0
);

const exit = page.close.bind( page );

for (let event  of  ['uncaughtException', 'unhandledRejection', 'SIGINT', 'exit'])
    process.on(event, exit);


describe('Page',  () => {

    before( page.goto.bind(page,  process.env.npm_package_homepage) );


    describe('Property',  () => {

        it('Title',  () => {

            return  page.title().should.be.fulfilledWith('Home - Documentation');
        });

        it('URL',  () => {

            page.url().should.be.equal( process.env.npm_package_homepage );
        });
    });

    describe('Cookie',  () => {

        it('.prototype.setCookie()',  async () => {

            await page.setCookie(
                {name: 'test', value: 'test'},
                {name: 'test', value: 'test', url: 'https://github.com/'}
            );

            (await page.cookies()).should.be.eql( [{test: 'test'}] );

            (await page.cookies('https://github.com/'))[0].test
                .should.be.eql('test');
        });

        it('.prototype.deleteCookie()',  async () => {

            await page.deleteCookie({name: 'test'});

            (await page.cookies()).should.be.eql( [{ }] );

            await page.deleteCookie({name: 'test', url: 'https://github.com/'});

            ((await page.cookies('https://github.com/'))[0].test || '')
                .should.be.eql('');
        });
    });

    describe('Selector',  () => {

        it('.prototype.$()',  async () => {

            (await page.$('a')).textContent.should.be.equal('Home');
        });

        it('.prototype.$$()',  async () => {

            const list = (await page.$$('h2 a')).map(link => link.textContent);

            list.should.be.eql( ['Home'] );
        });
    });

    it('Viewport',  async () => {

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

    describe('.prototype.evaluate()',  () => {

        it('Expression',  () => {

            return page.evaluate('document.title')
                .should.be.fulfilledWith('Home - Documentation');
        });

        it('Function',  () => {

            return page.evaluate(function () {

                return document.title;

            }).should.be.fulfilledWith('Home - Documentation');
        });

        it('Function with parameter',  () => {

            return page.evaluate(function (name, version) {

                return document.title + ' - ' + name + ' ' + version;

            }, 'IE', 11).should.be.fulfilledWith('Home - Documentation - IE 11');
        });

        it('Sync error',  () => {

            return  page.evaluate('test.error').should.be.rejectedWith( ReferenceError );
        });

        it('Function returns resolved Promise',  () => {

            return  page.evaluate(function () {

                return  new Promise(function (resolve) {

                    setTimeout( resolve.bind(null, 'Async result') );
                });
            }).should.be.fulfilledWith('Async result');
        });

        it('Function returns rejected Promise',  () => {

            const error = new EvalError('Async error');

            error.code = 0;

            return  page.evaluate(function () {

                return  new Promise(function (resolve, reject) {

                    setTimeout( resolve.bind(null, 'Async result') );

                    reject(new EvalError('Async error'));
                });
            }).should.be.rejectedWith( error );
        });
    });

    it('Console event',  async () => {

        var event = new Promise((resolve) => {

            page.on('console', resolve);
        });

        await page.evaluate('console.log("test")');

        event = await event;

        event.type().should.be.equal('log');

        event.args().should.be.eql( ['test'] );
    });

    describe('.prototype.addStyleTag()',  () => {

        it('Content',  async () => {

            await page.addStyleTag({
                content:    'body { color: blue; }'
            });

            (await page.evaluate('self.getComputedStyle( document.body ).color'))
                .should.be.equal('rgb(0, 0, 255)');
        });

        it('Path',  async () => {

            await page.addStyleTag({path: 'test/index.css'});

            (await page.evaluate('self.getComputedStyle( document.body ).color'))
                .should.be.equal('rgb(255, 0, 0)');
        });

        it('URL',  async () => {

            await page.addStyleTag({
                url:    'https://cdn.bootcss.com/github-markdown-css/2.10.0/github-markdown.min.css'
            });

            (await page.evaluate(function () {

                var article = document.querySelector('#main article');

                article.className = 'markdown-body';

                return  self.getComputedStyle( article.querySelector('h1') ).borderBottomWidth;

            })).should.be.equal('1px');
        });
    });

    describe('.prototype.addScriptTag()',  () => {

        it('Content',  async () => {

            await page.addScriptTag({
                content:    'self.__test__ = "Test";'
            });

            (await page.evaluate('self.__test__')).should.be.equal('Test');
        });

        it('URL',  async () => {

            await page.addScriptTag({
                url:    'https://cdn.bootcss.com/jquery/3.3.1/jquery.slim.min.js'
            });

            (await page.evaluate('typeof self.jQuery === "function"')).should.be.true();
        });
    });

    describe('.prototype.waitFor()',  () => {

        it('Number',  async () => {

            const start = Date.now();

            await page.waitFor(500);

            Date.now().should.be.aboveOrEqual(start + 500);
        });

        it('Function',  async () => {

            const end = Date.now() + 500;

            await page.waitFor(function (end) {

                return  (Date.now() >= end);

            }, null, end);

            Date.now().should.be.aboveOrEqual( end );
        });
    });

    describe('.prototype.exposeFunction()',  () => {

        it('Define & Use',  async () => {

            const MD5 = raw  =>  Crypto.createHash('md5').update( raw ).digest('hex');

            await page.exposeFunction('MD5', MD5);

            (await page.evaluate('self.MD5( location.href )')).should.be.equal(
                MD5( page.url() )
            );
        });

        it(
            'Remote error',
            ()  =>  page.evaluate('self.MD5()').should.be.rejectedWith( TypeError )
        );

        it('Reload & Redefine',  async () => {

            await page.reload();

            (await page.evaluate('self.MD5 instanceof Function')).should.be.true();
        });
    });

    describe('Event',  () => {

        it('.prototype.focus()',  async () => {

            await page.focus('a');

            (await page.evaluate('document.activeElement.textContent')).should.be.equal('Home');
        });

        it('.prototype.select()',  async () => {

            await page.evaluate(function (HTML) {

                document.querySelector('article').innerHTML = HTML;
            }, `
                <select multiple>
                    <option>0</option>
                    <option>1</option>
                    <option>2</option>
                </select>
            `);

            (await page.select('select', '1', '2', '3')).should.be.eql(['1', '2']);

            (await page.$$('option')).filter(item => item.selected).map(item => item.value)
                .should.be.eql(['1', '2']);
        });

        it('.prototype.click()',  async () => {

            await page.click('a');

            await page.waitForNavigation();

            page.url().should.be.equal(process.env.npm_package_homepage  +  'index.html');
        });

        it('.prototype.type()',  async () => {

            const input = await page.$('h1');

            input.setAttribute('contentEditable', true);

            await page.type('h1', ', Hello!');

            input.innerText.should.be.equal('Puppeteer-IE, Hello!');
        });
    });

    describe('Navigator',  () => {

        it('.prototype.reload()',  async () => {

            await page.reload();

            (await page.$('h1')).innerText.should.be.equal('Puppeteer-IE');
        });

        it('.prototype.goBack()',  async () => {

            await page.goBack();

            page.url().should.be.equal( process.env.npm_package_homepage );
        });

        it('.prototype.goForward()',  async () => {

            await page.goForward();

            page.url().should.be.equal(process.env.npm_package_homepage  +  'index.html');
        });
    });

    it('.prototype.screenshot()',  async () => {

        const path = 'test/temp.png';

        if (FS.existsSync( path ))  FS.unlinkSync( path );

        const buffer = await page.screenshot({ path });

        buffer.length.should.be.greaterThan( 0 );

        FS.readFileSync( path ).length.should.be.greaterThan( 0 );
    });
});
