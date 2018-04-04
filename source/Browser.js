'use strict';

const EventEmitter = require('events'), Page = require('./Page');


/**
 * A Browser is created when Puppeteer connects to a Internet Explorer instance
 *
 * @class
 * @extends EventEmitter
 */
class Browser extends EventEmitter {

    constructor(headless = true) {

        super().headless = headless;

        this._page = [ ];
    }

    /**
     * @return {Promise<Page>}
     */
    async newPage() {

        const page = new Page( this.headless );

        this._page.push( page );

        return page;
    }

    /**
     * Closes Internet Explorer and all of its pages (if any were opened).
     * The Browser object itself is considered to be disposed and cannot be used anymore.
     *
     * @return {Promise}
     */
    close() {

        if ( arguments[0] )  console.warn( arguments[0] );

        return  Promise.all([... this._page].map(()  =>  this._page.shift().close()));
    }

    /**
     * @return {Promise<Array<Page>>} Promise which resolves to an array of all open pages
     */
    async pages() {

        return  this._page;
    }

    /**
     * @return {Promise<string>} Promise which resolves to the browser's original user agent
     */
    async userAgent() {

        return  this._page[0].window.navigator.userAgent;
    }
}

module.exports = Browser;
