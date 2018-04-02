'use strict';

const EventEmitter = require('events'), WinAX = require('winax');


/**
 * Web page
 *
 * @class
 * @extends {EventEmitter}
 */
class Page extends EventEmitter {

    constructor(headless = true) {

        super();

        this._target = new ActiveXObject('InternetExplorer.Application');

        this._target.Visible = !headless;
    }

    static proxy(COM) {

        const getter = { };

        for (let key  of  COM.__type)
            if (key.invkind === 2)  getter[ key.name ] = 1;

        return  new Proxy(COM, {
            get:    function (target, name) {

                target = target[ name ];

                return  (name in getter)  ?  target.valueOf()  :  target;
            }
        });
    }

    get document() {  return  Page.proxy( this._target.Document );  }

    get window() {  return  Page.proxy( this.document.defaultView );  }

    url() {

        return  this._target.LocationURL + '';
    }

    title() {

        return  this._target.LocationName + '';
    }

    async waitForNavigation() {

        const IE = this._target;

        await  new Promise(function (resolve) {

            setTimeout(function check() {

                if (IE.Busy  &&  (IE.Busy.valueOf() === false))
                    resolve();
                else
                    setTimeout( check );
            });
        });

        this.emit('load');
    }

    goto(url = 'about:blank') {

        this._target.Navigate( url );

        return this.waitForNavigation();
    }

    async goBack() {

        this._target.GoBack();

        return this.waitForNavigation();
    }

    async goForward() {

        this._target.GoForward();

        return this.waitForNavigation();
    }

    async reload() {

        this._target.Refresh();

        return this.waitForNavigation();
    }

    async close() {

        this._target.Quit();

        WinAX.release( this._target );

        this.emit('close');
    }

    async content() {

        const DocType = this.document.doctype;

        var type = `<!DocType ${(DocType.name + '').toUpperCase()}`;

        if ( DocType.publicId.valueOf() )
            type += ` Public "${DocType.publicId}"`;

        if ( DocType.systemId.valueOf() )
            type += ` "${DocType.systemId}"`;

        return `${type}>${this.document.documentElement.outerHTML}`;
    }

    async $(selector = '') {

        return  Page.proxy( this.document.querySelector( selector ) );
    }

    async $$(selector = '') {

        const list = this.document.querySelectorAll( selector );

        const length = list.length - 0, result = [ ];

        for (let i = 0;  i < length;  i++)
            result[i] = Page.proxy( list.item(i) );

        return result;
    }

    async evaluate(expression, ...parameter) {

        expression = (expression instanceof Function)  ?
            `(${expression})(${
                parameter.map(item => JSON.stringify( item ))
            })` :
            `(function () { return ${expression}; })()`;

        try {
            this.window.execScript(
                `self.name = JSON.stringify(${ expression }) || ''`
            );
        } catch (error) {

            console.warn( expression );

            throw error;
        }

        return  this.window.name  &&  JSON.parse( this.window.name );
    }

    trigger(selector, type, name, bubble, cancel) {

        return  this.evaluate(function (selector, type, name, bubble, cancel) {

            var target = document.querySelector( selector ),
                event = document.createEvent( type );

            event.initEvent(name, bubble, cancel);

            target.dispatchEvent( event );

        }, selector, type, name, bubble, cancel);
    }

    async click(selector) {

        await this.trigger(selector, 'MouseEvent', 'mousedown', true, true);

        await this.trigger(selector, 'MouseEvent', 'mouseup', true, true);

        this.document.querySelector( selector ).click();
    }

    async focus(selector) {

        this.document.querySelector( selector ).focus();
    }
}

module.exports = Page;
