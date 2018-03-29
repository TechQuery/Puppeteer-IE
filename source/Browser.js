'use strict';

const EventEmitter = require('events'), Page = require('./Page');


class Browser extends EventEmitter {

    constructor() {

        super();

        this._page = [ ];
    }

    newPage() {

        const page = new Page();

        this._page.push( page );

        return  Promise.resolve( page );
    }

    close() {
        
        return  Promise.all(this._page.map(function (page) {
            
            return page.close();
        }));
    }
}

module.exports = Browser;
