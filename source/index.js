'use strict';

/**
 * Event emitter
 *
 * @typedef {EventEmitter} EventEmitter
 *
 * @see {@link https://nodejs.org/dist/latest-v6.x/docs/api/events.html#events_class_eventemitter|Node.JS - Event module}
 */

const Browser = require('./Browser'), stack = [ ];


/**
 * Puppeteer API
 *
 * @class
 */
class Puppeteer {
    /**
     * Launch a Browser
     *
     * @memberof Puppeteer
     *
     * @param {object} [options]
     *
     * @return {Promise<Browser>}
     */
    static async launch(options = { }) {

        return  stack[stack.push(new Browser( options.headless )) - 1];
    }

    static executablePath() {

        const page = stack[0]  &&  stack[0]._page[0];

        return  page  &&  (page._target.FullName + '');
    }
}


async function clear(error) {

    await Promise.all( stack.map(browser => browser.close()) );

    throw error;
}

for (let event  of  ['uncaughtException', 'unhandledRejection', 'SIGINT', 'exit'])
    process.on(event, clear);


module.exports = Puppeteer;
