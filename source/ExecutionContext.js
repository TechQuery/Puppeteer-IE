'use strict';

const FS = require('fs'), Path = require('path');


class ExecutionContext {

    constructor(page) {

        this._page = page;

        this._pending = { };
    }

    attach() {

        this._page.window.execScript(
            FS.readFileSync(
                Path.resolve(Path.dirname( module.id ),  'BrowserService.js'),
                {encoding: 'utf-8'}
            )
        );

        setInterval( this.readMessage.bind( this ) );
    }

    static errorOf(data) {

        const error = global[ data.name ]( data.message );

        for (let key in data)
            if (! error[ key ])  error[ key ] = data[ key ];

        return error;
    }

    readMessage() {  /* eslint no-console: "off" */

        const window = this._page.window;

        var data = /B_(\w)_(\d*)_([\s\S]*)/.exec( window.name );

        if (! data)  return;

        window.name = '';

        const promise = this._pending[ data[2] ];

        if ( data[3] )  try {

            data[3] = JSON.parse( data[3] );

        } catch (error) {  console.error( error );  }

        switch ( data[1] ) {
            case 'R':
                if ( promise )  promise[0]( data[3] );
                break;
            case 'E':    {
                let error = ExecutionContext.errorOf( data[3] );

                if ( promise )
                    promise[1]( error );
                else
                    this._page.emit('pageerror', error);

                break;
            }
            case 'M':    if (data[3].source === 'console')
                this._page.emit('console', data[3].data);
        }
    }

    evaluate(expression, ...parameter) {

        const key = Date.now();

        const promise = new Promise((resolve, reject) => {

            this._pending[ key ] = [resolve, reject];
        });

        try {
            this._page.window.execScript(
                `self.puppeteer.execute(${key}, ${

                    (expression instanceof Function)  ?
                        expression  :  JSON.stringify( expression )

                }, ${JSON.stringify( parameter )})`
            );
        } catch (error) {

            console.warn( expression );

            throw error;
        }

        return promise;
    }
}

module.exports = ExecutionContext;
