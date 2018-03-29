'use strict';

const EventEmitter = require('events');

require('winax');


class Page extends EventEmitter {

    constructor() {

        super();

        this._target = new ActiveXObject('InternetExplorer.Application');

        this._target.Visible = true;
    }

    goto(url = 'about:blank') {

        this._target.navigate( url );

        const IE = this._target;

        return  new Promise(function (resolve) {

            setInterval(function () {

                if (IE.Busy === false)  resolve();
            });
        });
    }

    close() {

        this._target.Quit();

        return  Promise.resolve( null );
    }
}

module.exports = Page;
