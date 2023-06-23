'use strict';

/**
 * Serializable value
 *
 * @typedef {number|boolean|string|object|array} Serializable
 *
 * @see     {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#Description|Promise}
 */

/**
 * A proxy of the return value in the future
 *
 * @typedef {Promise} Promise
 *
 * @see     {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise|Promise}
 */

/**
 * Event emitter
 *
 * @typedef {EventEmitter} EventEmitter
 *
 * @see {@link https://nodejs.org/dist/latest-v6.x/docs/api/events.html#events_class_eventemitter|Node.JS - Event module}
 */

/**
 * Binary buffer
 *
 * @typedef {Buffer} Buffer
 *
 * @see {@link https://nodejs.org/dist/latest-v6.x/docs/api/buffer.html#buffer_buffer|Node.JS - Buffer}
 */

const Browser = require('./Browser'), stack = [ ];


/**
 * Puppeteer API
 *
 * @class
 */
class Puppeteer {
    /**
     * Launch a browser instance with given arguments.
     * The browser will be closed when the parent NodeJS process is closed.
     *
     * @param {object}  [options]                 Set of configurable options to set on the browser
     * @param {boolean} [options.headless = true] Whether to run browser in headless mode
     *
     * @return {Promise<Browser>}
     */
    static async launch({headless = true} = { }) {

        return  stack[stack.push(new Browser( headless )) - 1];
    }

    /**
     * @return {string} A path where Puppeteer expects to find Internet Explorer
     */
    static executablePath() {

        const page = stack[0]  &&  stack[0]._page[0];

        return  page  &&  (page._target.FullName + '');
    }

    /**
     * @param {?Error} error
     */
    static async exit(error) {

        await Promise.all( stack.map(browser => browser.close()) );

        if (!(error instanceof Error))  process.exit(0);

        console.error( error );

        process.exit(1);
    }
}


for (let event  of  ['uncaughtException', 'unhandledRejection', 'SIGINT', 'exit'])
    process.on(event, Puppeteer.exit);


module.exports = Puppeteer;
