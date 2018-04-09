'use strict';

class Keyboard {
    /**
     * @constructs
     *
     * @param {Page} page - The page which this keyboard press
     */
    constructor(page) {
        this._page = page;
        this._target = 'none';
    }

    async down(key, options) {

    }
    
    async press(key, options) {

    }

    async sendCharacter(char) {

    }

    async type(text, options) {

    }

    async up(key) {

    }

    _trigger(name,  bubble,  cancel,  options = { }) {
        return this._page.trigger(
            this._target,  'Keyboard',  'key' + name,
            bubble,  cancel,  page.document.defaultView, options.char,
            options.key, options.location, options.modifiersList, options.repeat
        );
    }

}