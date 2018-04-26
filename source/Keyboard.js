'use strict';
import keycode from 'keycode'

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
     * @param {boolean} [options.repeat=false]
     * @param {number} [options.locale='']     For trusted events, the locale property is set for keyboard and Input Method Editor (IME) input only.
     *
     * @return {Promise}
     */
    async press(key, options = {
        locationArg: 0,
        modifiersListArg: '',
        repeat: false,
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

    /** 
     * Dispatches a `sendCharacter` event
     * 
     * @param {string} [char]  `single character to send`
     * 
     * @return {Promise}
     */

    async sendCharacter(char) {
        let modifiersListArg = '';
        const charCode = char.charCodeAt()
        const punctuates = [33,34,35,36,37,38,40,41,42,43,58,60,62,63,64,94,95,123,124,125,126];
        if ((punctuates.indexOf(charCode) !== -1) || (charCode > 64 && charCode < 91)){
            modifiersListArg = 'Shift';
        }
        this.press(char,{
            locationArg: 0,
            modifiersListArg: modifiersListArg,
            repeat: false,
            locale: '',
        })
    }

     /** 
     * Dispatches a `type` event
     * 
     * @param {string} [text]  `text to send`
     * @param {object} [options]
     * @param {int} [options.delay]  `input delay for each character`
     * 
     * @return {Promise}
     */

    async type(text, options) {
        let delay = 0;
        if (options && options.delay)
          delay = options.delay;
          for (const char of text) {
              await this.sendCharacter(char)
              if (delay){
                await new Promise(f => setTimeout(f, delay));
              }
          }
    }
   
    _trigger(name,  bubble,  cancel, key, options = { }) {
        return this._page.trigger(
            this._target,  'Keyboard',  'key' + name,
            bubble,  cancel,  page.document.defaultView, key, 
            options.location, options.modifiersList, options.repeat, options.locale
        );
    }
}

export default Keyboard;