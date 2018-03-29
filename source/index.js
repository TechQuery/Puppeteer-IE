'use strict';

const Browser = require('./Browser');

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
     * @return {Promise}
     */
    static launch() {
        
        return  Promise.resolve(new Browser());
    }
}

module.exports = Puppeteer;
