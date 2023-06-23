(function () {

    function Puppeteer() {

        this.stack = { };
    }

    var slice = Array.prototype.slice;

    Puppeteer.prototype = {
        constructor:    Puppeteer,
        sendData:       function (key, data) {

            if (arguments.length < 2)  data = key, key = '';

            var type = key ? 'R' : 'M';

            /**
             * @see {@link https://docs.microsoft.com/en-us/scripting/javascript/reference/javascript-run-time-errors}
             */
            if (data instanceof Error)
                type = 'E',  data = {
                    name:            data.name,
                    code:            data.number & 0x0FFFF,
                    message:         data.message,
                    description:     data.description,
                    fileName:        data.fileName,
                    lineNumber:      data.lineNumber,
                    columnNumber:    data.columnNumber,
                    stack:           data.stack
                };
            else if (data instanceof Element)
                data = data.sourceIndex;

            self.postMessage([type,  key || '',  data || ''],  '*');
        },
        execute:        function (key, code, parameter) {

            var sendData = this.sendData.bind(this, key);

            setTimeout(function () {
                try {
                    Promise.resolve(
                        (code instanceof Function)  ?
                            code.apply(null, parameter)  :  eval( code )
                    ).then(
                        sendData, sendData
                    );
                } catch (error) {  sendData( error );  }
            });
        },
        define:         function (name) {

            var that = this;

            self[ name ] = function () {

                var parameter = slice.call( arguments );

                return  new Promise(function () {

                    parameter = {
                        type:    'C',
                        data:    {
                            name:         name,
                            parameter:    parameter
                        },
                        key:     Date.now()
                    };

                    that.queue.push( parameter );

                    that.stack[ parameter.key ] = arguments;
                });
            };
        }
    };

    ['resolve', 'reject'].forEach(function (name, index) {

        Puppeteer.prototype[ name ] = function (key, data) {

            this.stack[ key ][ index ]( data );

            delete  this.stack[ key ];
        };
    });


    self.puppeteer = new Puppeteer();

    /* eslint no-console: "off" */

    ['log', 'info', 'warn', 'error', 'dir'].forEach(function (key) {

        var method = console[ key ];

        console[ key ] = function () {

            self.puppeteer.sendData({
                source:    'console',
                type:      key,
                data:      slice.call( arguments )
            });

            return  method.apply(this, arguments);
        };
    });

    //  Global error

    self.onerror = function (message, URL, line, column, error) {

        if (! (error instanceof Error)) {

            error = new Error( message );

            error.fileName = URL,  error.lineNumber = line,  error.columnNumber = column;
        }

        this.puppeteer.sendData( error );
    };
})();
