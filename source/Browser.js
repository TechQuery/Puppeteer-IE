'use strict';

const EventEmitter = require('events'), Page = require('./Page');


/**
 * Web browser
 *
 * @class
 * @extends {EventEmitter}
 */
class Browser extends EventEmitter {

    constructor(headless = true) {

        super().headless = headless;

        this._page = [ ];
    }

    async newPage() {

        const page = new Page();

        this._page.push( page );

        return page;
    }

    close() {

        return  Promise.all(this._page.map(function (page) {

            return page.close();
        }));
    }

    async pages() {

        return  this._page;
    }

    async userAgent() {

        return  this._page[0].window.navigator.userAgent;
    }
}

module.exports = Browser;
