'use strict';

const Utility = require('./utility');


class ExecutionContext {

    constructor(page) {

        this._page = page;
    }

    static functionOf(expression, parameter) {

        return  (expression instanceof Function) ?
            `(${expression})(${
                parameter.map(
                    item  =>  (item !== void 0)  ?  JSON.stringify( item )  :  'void 0'
                )
            })` :
            `(function () { return ${expression}; })()`;
    }

    static wrapScript(key, expression, parameter, element) {

        return  `(function () {

    var status;

    function sendBack(data) {

        var type = 'R';

        if (data instanceof Error)
            type = 'E',  data = {
                name:           data.name,
                code:           data.number & 0x0FFFF,
                message:        data.message,
                description:    data.description
            };

        setTimeout(function main() {

            if ( status )  return;

            status = type;

            if ( self.name )  return setTimeout( main );

            self.name = [
                'PIE',  ${key},  type,  JSON.stringify( data ) || ''
            ].join('_');
        });
    }

    setTimeout((function (resolve, reject) {
        try {
            var result = ${ExecutionContext.functionOf(expression, parameter)};

        } catch (error) {  return reject( error );  }

        if (typeof (result || '').then  ===  'function')
            result.then(resolve, reject);
        else
            resolve( result );

    }).bind(null,  function (data) {

        sendBack( data${element ? '.sourceIndex' : ''} );

    },  sendBack));
})()`;
    }

    evaluateJS(expression, parameter, element) {

        const key = Date.now(), window = this._page.window;

        expression = ExecutionContext.wrapScript(key, expression, parameter, element);

        try {
            window.execScript( expression );

        } catch (error) {

            console.warn( expression );

            throw error;
        }

        return  Utility.waitFor(0,  () => {

            var result = /PIE_(\d{13,})_(R|E)_([\s\S]*)/.exec( window.name );

            if ((result || '')[1]  !=  key)  return;

            window.name = '';

            if (result[2] === 'R')
                try {
                    return  JSON.parse( result[3] );
                } catch (error) {
                    return  result[3];
                }

            result = JSON.parse( result[3] );

            const error = global[ result.name ]( result.message );

            if ( result.number )  error.number = result.number;

            if ( result.description )  error.description = result.description;

            /**
             * @see {@link https://docs.microsoft.com/en-us/scripting/javascript/reference/javascript-run-time-errors}
             */
            throw error;

        },  true);
    }
}

module.exports = ExecutionContext;
