'use strict';

const { readFileSync } = require('fs'), { join } = require('path');

const { currentModulePath, toES_5 } = require('@tech_query/node-toolkit');


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

    require(module, file, namespace) {

        const { window } = this._page;

        const ready = new Promise(resolve => {

            function end({ data }) {

                if (data === true)
                    window.detachEvent('onmessage', end),  resolve();
            }

            setTimeout(()  =>  window.attachEvent('onmessage', end));
        });

        window.execScript(
            readFileSync(
                require.resolve(`${module}/dist/${file || module}.min`)
            ) + ''
        );

        window.execScript(`setTimeout(function check() {

            if (self.${namespace || module} instanceof Object)
                self.postMessage(true, '*');
            else
                setTimeout( check );
        })`);

        return ready;
    }

    async attach() {

        await this.require('@babel/polyfill', 'polyfill', 'Promise');

        this._page.window.execScript( BrowserService );

        this._page.window.attachEvent('onmessage',  this.readMessage.bind( this ));

        for (let name  in  this._export)
            this.expose(name,  this._export[ name ]);
    }

    static errorOf(data) {

        const error = global[ data.name ]( data.message );

        for (let key in data)
            if (! error[ key ])  error[ key ] = data[ key ];

        return error;
    }

    async readMessage({ data: [type, key, data] }) {

        const [resolve, reject] = this._pending[ key ]  ||  [ ];

        switch ( type ) {
            case 'R':
                if ( resolve )  resolve( data );
                break;
            case 'E':    {
                let error = ExecutionContext.errorOf( data );

                if ( reject )
                    reject( error );
                else
                    this._page.emit('pageerror', error);

                break;
            }
            case 'M':
                if (data.source === 'console')
                    this._page.emit(
                        'console',  new ConsoleMessage(data.type, data.data)
                    );
                break;
            case 'C':
                await this.execute(key, data);
        }
    }

    static stringify(expression) {

        expression = (expression instanceof Function)  ?
            toES_5(`(${ expression })`)  :
            JSON.stringify( toES_5(expression + '') );

        return  expression.replace(/;("?)$/, '$1');
    }

    evaluate(expression, ...parameter) {

        const key = Date.now();

        const promise = new Promise(
            (resolve, reject)  =>  this._pending[ key ] = [resolve, reject]
        );

        expression = ExecutionContext.stringify( expression );

        parameter = JSON.stringify(parameter,  (key, value) => {

            if (value instanceof Function)
                return  ExecutionContext.stringify( value );

            return value;
        });

        try {
            this._page.window.execScript(
                `self.puppeteer.execute(${key}, ${expression}, ${parameter})`
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
