'use strict';

const { readFileSync } = require('fs'), { join } = require('path');

const { currentModulePath, toES_5 } = require('@tech_query/node-toolkit');

const { waitFor } = require('./utility');


const BrowserService = readFileSync(
    join(currentModulePath(),  '../BrowserService.js')
) + '';


class ConsoleMessage {

    constructor(type, args) {

        this._type = type,  this._args = args;
    }

    type() {  return  this._type;  }

    args() {  return  this._args;  }
}


class ExecutionContext {

    constructor(page) {

        this._page = page,  this._pending = { },  this._export = { };
    }

    async require(module, file, namespace) {

        const window = this._page.window;

        window.execScript(
            readFileSync(
                require.resolve(`${module}/dist/${file || module}.min`),
                {encoding: 'utf-8'}
            )
        );

        window.execScript(`setTimeout(function check() {

            (self.name = (self.${namespace || module} instanceof Object))  ||
                setTimeout( check );
        })`);

        await waitFor(()  =>  (window.name === 'true'));

        window.name = '';
    }

    async attach() {

        await this.require('@babel/polyfill', 'polyfill', 'Promise');

        if (this._interval != null)  clearInterval( this._interval );

        this._page.window.execScript( BrowserService );

        this._interval = setInterval( this.readMessage.bind( this ) );

        for (let name  in  this._export)
            this.expose(name,  this._export[ name ]);
    }

    static errorOf(data) {

        const error = global[ data.name ]( data.message );

        for (let key in data)
            if (! error[ key ])  error[ key ] = data[ key ];

        return error;
    }

    async readMessage() {

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
            case 'M':
                if (data[3].source === 'console')
                    this._page.emit(
                        'console',  new ConsoleMessage(data[3].type, data[3].data)
                    );
                break;
            case 'C':
                await this.execute(data[2], data[3]);
        }
    }

    evaluate(expression, ...parameter) {

        const key = Date.now();

        const promise = new Promise(
            (resolve, reject)  =>  this._pending[ key ] = [resolve, reject]
        );

        expression = (expression instanceof Function)  ?
            toES_5(`(${ expression })`)  :
            JSON.stringify( toES_5(expression + '') );

        expression = expression.replace(/;$/, '');

        try {
            this._page.window.execScript(
                `self.puppeteer.execute(
                    ${key}, ${expression}, ${JSON.stringify( parameter )}
                )`
            );
        } catch (error) {

            console.warn( expression );

            throw error;
        }

        return promise;
    }

    async execute(key, data) {

        const window = this._page.window;

        try {
            window.execScript(
                `self.puppeteer.resolve(${key}, ${JSON.stringify(
                    await this._export[ data.name ].apply(null,  data.parameter)
                )})`
            );
        } catch (error) {

            window.execScript(
                `self.puppeteer.reject(${key},  new self['${error.name}'](
                    ${JSON.stringify( error.message )}
                ))`
            );
        }
    }

    expose(name, code) {

        this._page.window.execScript( `self.puppeteer.define('${name}')` );

        this._export[ name ] = code;
    }
}

module.exports = ExecutionContext;
