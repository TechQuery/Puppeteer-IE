'use strict';

const EventEmitter = require('events'), Path = require('path');

const WinAX = require('winax');


/**
 * Web page
 *
 * @class
 * @extends {EventEmitter}
 */
class Page extends EventEmitter {

    constructor(headless = true) {

        super();

        const IE = this._target = new ActiveXObject('InternetExplorer.Application');

        IE.Visible = !headless;

        IE.MenuBar = IE.StatusBar =  false;
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

    static waitFor(filter,  timeOut = 30000) {

        return  new Promise(function (resolve, reject) {

            var start = Date.now();

            setTimeout(function check(result) {

                if (timeOut  &&  ((Date.now() - start)  >=  timeOut))
                    return reject();

                (result = filter())  ?  resolve( result )  :  setTimeout( check );
            });
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

    async waitForNavigation({ timeout }) {

        await Page.waitFor(
            ()  =>  this._target.Busy  &&  (this._target.Busy == false),
            timeout
        );

        this.emit('load');
    }

    waitForSelector(selector,  { timeout }) {

        return  Page.waitFor(() => this.$( selector ),  timeout);
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

    async setContent(HTML) {

        this.document.open();

        this.document.write( HTML );

        this.document.close();
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
                parameter.filter(
                    value  =>  (value !== undefined)
                ).map(
                    item  =>  JSON.stringify( item )
                )
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

    setViewport({width, height}) {

        return  this.evaluate(function (width, height) {

            self.resizeTo(
                self.outerWidth - self.innerWidth + width,
                self.outerHeight - self.innerHeight + height
            );
        },  width,  height);
    }

    async viewport() {

        return Object.assign(
            await this.evaluate(function () {

                return {
                    width:     self.innerWidth,
                    height:    self.innerHeight
                };
            }),
            {
                deviceScaleFactor:    1,
                isMobile:             false,
                hasTouch:             false,
                isLandscape:          true
            }
        );
    }

    async addStyleTag({path, url, content}) {

        if ( path )  url = Path.resolve( path );

        var CSS;

        if ( url ) {
            CSS = this.document.createElement('link');

            CSS.rel = 'stylesheet',  CSS.href = url;
        } else {
            CSS = this.document.createElement('style');

            CSS.textContent = content;
        }

        this.document.head.appendChild( CSS );
    }

    async addScriptTag({path, url, content}) {

        if ( path )  url = Path.resolve( path );

        var JS = this.document.createElement('script');

        JS[url ? 'src' : 'text'] = url || content;

        this.document.head.appendChild( JS );
    }

    async trigger(selector, type, name, bubble, cancel) {

        var target = this.document.querySelector( selector ),
            event = this.document.createEvent( type );

        event.initEvent(name, bubble, cancel);

        target.dispatchEvent( event );
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
