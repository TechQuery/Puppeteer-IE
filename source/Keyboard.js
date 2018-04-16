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
    
    /** 
     * Dispatches a `keydown` event
     * 
     * @param {DomString} [key]  'https://msdn.microsoft.com/en-us/expression/gg305568(v=vs.100)'
     * @param {object} [options]
     * @param {unsigned long} [options.locationArg=0] 'https://msdn.microsoft.com/en-us/expression/ff974894(v=vs.100)'
     * @param {string} [options.modifiersListArg=''] `Alt`, `AltGraph`, `CapsLock`, `Control`, `Meta`, `NumLock`, `Scroll`, `Shift`, `Win`
     * @param {boolean} [options.repeat=false]
     * @param {number} [options.locale='']       For trusted events, the locale property is set for keyboard and Input Method Editor (IME) input only.
     *
     * @return {Promise}
     */
    async down(key, options = {
        locationArg: 0,
        modifiersListArg: '',
        repeat: false,
        locale: '',
    }) {
       return _trigger('down', true, true, options);
    }
    
    /** 
     * Dispatches a `keypress` event
     * 
     * @param {DomString} [key]  'https://msdn.microsoft.com/en-us/expression/gg305568(v=vs.100)'
     * @param {object} [options]
     * @param {unsigned long} [options.locationArg=0] 'https://msdn.microsoft.com/en-us/expression/ff974894(v=vs.100)'
     * @param {string} [options.modifiersListArg=''] `Alt`, `AltGraph`, `CapsLock`, `Control`, `Meta`, `NumLock`, `Scroll`, `Shift`, `Win`
     * @param {boolean} [options.repeat=true]
     * @param {number} [options.locale='']     For trusted events, the locale property is set for keyboard and Input Method Editor (IME) input only.
     *
     * @return {Promise}
     */
    async press(key, options = {
        locationArg: 0,
        modifiersListArg: '',
        repeat: true,
        locale: '',
    }) {
       return _trigger('press', true, true, options);
    }

    /** 
     * Dispatches a `keyup` event
     * 
     * @param {DomString} [key]  'https://msdn.microsoft.com/en-us/expression/gg305568(v=vs.100)'
     * @param {object} [options]
     * @param {unsigned long} [options.locationArg=0] 'https://msdn.microsoft.com/en-us/expression/ff974894(v=vs.100)'
     * @param {string} [options.modifiersListArg=''] `Alt`, `AltGraph`, `CapsLock`, `Control`, `Meta`, `NumLock`, `Scroll`, `Shift`, `Win`
     * @param {boolean} [options.repeat=false]  
     * @param {number} [options.locale='']     For trusted events, the locale property is set for keyboard and Input Method Editor (IME) input only.
     *
     * @return {Promise}
     */
    async up(key, options = {
        locationArg: 0,
        modifiersListArg: '',
        repeat: false,
        locale: '',
    }) {
       return _trigger('up', true, true, options);
    }

    async sendCharacter(char) { //no repeat keypress?

    }

    async type(text, options) {  // loop send charater?

    }
   
    _trigger(name,  bubble,  cancel, key, options = { }) {
        return this._page.trigger(
            this._target,  'Keyboard',  'key' + name,
            bubble,  cancel,  page.document.defaultView, key, 
            options.location, options.modifiersList, options.repeat, options.locale
        );
    }
}