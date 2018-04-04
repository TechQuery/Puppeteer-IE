'use strict';

const EventEmitter = require('events'), Path = require('path');

const WinAX = require('winax');

const Utility = require('./utility'), Mouse = require('./Mouse');


/**
 * Page provides methods to interact with a single tab in Internet Explorer.
 * One Browser instance might have multiple Page instances.
 *
 * @class
 * @extends EventEmitter
 *
 * @property {Mouse} mouse
 */
class Page extends EventEmitter {

    constructor(headless = true) {

        const IE = super()._target = new ActiveXObject(
            'InternetExplorer.Application'
        );

        IE.Visible = !headless,  IE.MenuBar = IE.StatusBar =  false;

        this.mouse = new Mouse( this );
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

    /**
     * @return {string}
     */
    url() {

        return  this._target.LocationURL + '';
    }

    /**
     * @return {Promise<string>}
     */
    async title() {

        return  this._target.LocationName + '';
    }

    /**
     * @param {object} [options]
     * @param {number} [options.timeout=30000] Maximum navigation time in milliseconds, pass 0 to disable timeout.
     *
     * @emits Page#load
     */
    async waitForNavigation(options = {timeout: 30000}) {

        await Utility.waitFor(
            options.timeout,
            ()  =>  this._target.Busy  &&  (this._target.Busy == false)
        );

        this.emit('load');
    }

    /**
     * @param {string} [url='about:blank']        URL to navigate page to. The url should include scheme, e.g. https://.
     * @param {object} [options]
     * @param {number} [options.timeout=30000]    Maximum navigation time in milliseconds, pass 0 to disable timeout.
     * @param {number} [options.waitUntil='load'] When to consider navigation succeeded
     *
     * @return {Promise}
     */
    goto(url = 'about:blank',  options = {timeout: 30000, waitUntil: 'load'}) {

        this._target.Navigate( url );

        return  this.waitForNavigation( options );
    }

    /**
     * Navigate to the previous page in history
     *
     * @param {object} [options]
     * @param {number} [options.timeout=30000]    Maximum navigation time in milliseconds, pass 0 to disable timeout.
     * @param {number} [options.waitUntil='load'] When to consider navigation succeeded
     *
     * @return {Promise}
     */
    goBack(options = {timeout: 30000, waitUntil: 'load'}) {

        this._target.GoBack();

        return  this.waitForNavigation( options );
    }

    /**
     * Navigate to the next page in history
     *
     * @param {object} [options]
     * @param {number} [options.timeout=30000]    Maximum navigation time in milliseconds, pass 0 to disable timeout.
     * @param {number} [options.waitUntil='load'] When to consider navigation succeeded
     *
     * @return {Promise}
     */
    goForward(options = {timeout: 30000, waitUntil: 'load'}) {

        this._target.GoForward();

        return  this.waitForNavigation( options );
    }

    /**
     * @param {object} [options]
     * @param {number} [options.timeout=30000]    Maximum navigation time in milliseconds, pass 0 to disable timeout.
     * @param {number} [options.waitUntil='load'] When to consider navigation succeeded
     *
     * @return {Promise}
     */
    reload(options = {timeout: 30000, waitUntil: 'load'}) {

        this._target.Refresh();

        return  this.waitForNavigation( options );
    }

    /**
     * @emits Page#close
     */
    async close() {

        if ( arguments[0] )  console.warn( arguments[0] );

        this._target.Quit();

        WinAX.release( this._target );

        this.emit('close');
    }

    /**
     * Gets the full HTML contents of the page, including the doctype.
     *
     * @return {Promise<string>}
     */
    async content() {

        const DocType = this.document.doctype;

        var type = `<!DocType ${(DocType.name + '').toUpperCase()}`;

        if ( DocType.publicId.valueOf() )
            type += ` Public "${DocType.publicId}"`;

        if ( DocType.systemId.valueOf() )
            type += ` "${DocType.systemId}"`;

        return `${type}>${this.document.documentElement.outerHTML}`;
    }

    /**
     * @param {string} HTML - HTML markup to assign to the page
     */
    async setContent(HTML) {

        this.document.open();

        this.document.write( HTML );

        this.document.close();
    }

    /**
     * The method runs `document.querySelector()` within the page.
     * If no element matches the selector, the return value resolve to `null`.
     *
     * @param {string} selector - A selector to query page for
     *
     * @return {Promise<?ElementHandle>}
     */
    async $(selector) {

        return  Page.proxy( this.document.querySelector( selector ) );
    }

    /**
     * The method runs `document.querySelectorAll()` within the page.
     * If no elements match the selector, the return value resolve to `[ ]`.
     *
     * @param {string} selector - A selector to query page for
     *
     * @return {Promise<Array<ElementHandle>>}
     */
    async $$(selector) {

        const list = this.document.querySelectorAll( selector );

        const length = list.length - 0, result = [ ];

        for (let i = 0;  i < length;  i++)
            result[i] = Page.proxy( list.item(i) );

        return result;
    }

    /**
     * Wait for the selector to appear in page.
     *
     * If at the moment of calling the method the selector already exists, the method will return immediately.
     * If the selector doesn't appear after the timeout milliseconds of waiting, the function will throw.
     *
     * @param {string} selector                A selector of an element to wait for
     * @param {object} [options]
     * @param {number} [options.timeout=30000] Maximum time to wait for in milliseconds, pass 0 to disable timeout.
     *
     * @return {Promise<ElementHandle>} Promise which resolves when element specified by selector string is added to DOM
     */
    waitForSelector(selector,  options = {timeout: 30000}) {

        return  Utility.waitFor(options.timeout,  () => this.$( selector ));
    }

    /**
     * @param {function|string} expression - Function or Expression to be evaluated in the page context
     * @param {Serializable}    parameter  - Arguments to pass to the function
     *
     * @return {Promise<Serializable>} Promise which resolves to the value of `expression`
     */
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

    isSameElement(pointA, pointB) {

        return  this.evaluate(function (A, B) {

            A = document.elementFromPoint(A[0], A[1]);

            B = document.elementFromPoint(B[0], B[1]);

            return  !(A.contains( B )  ||  B.contains( A ));

        },  pointA,  pointB);
    }

    /**
     * In the case of multiple pages in a single browser, each page can have its own viewport size
     *
     * @param {object} viewport
     * @param {number} [viewport.width]  page width in pixels
     * @param {number} [viewport.height] page height in pixels
     *
     * @return {Promise}
     */
    setViewport({width, height}) {

        return  this.evaluate(function (width, height) {

            self.resizeTo(
                self.outerWidth - self.innerWidth + width,
                self.outerHeight - self.innerHeight + height
            );
        },  width,  height);
    }

    /**
     * @return {Promise<object>} Include keys of `width`, `height`, `deviceScaleFactor`, `isMobile`, `hasTouch` & `isLandscape`
     */
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

    /**
     * Adds a `<link rel="stylesheet">` tag into the page with the desired url or a `<style type="text/css">` tag with the content
     *
     * @param {object} options
     * @param {string} [options.path]    Path to the CSS file to be injected into frame.
     *                                   If path is a relative path, then it is resolved relative to current working directory.
     * @param {string} [options.url]     URL of the <link> tag
     * @param {string} [options.content] Raw CSS content to be injected into frame
     *
     * @return {Promise} which resolves to the added tag when the stylesheet's onload fires
     *                   or when the CSS content was injected into frame
     */
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

    /**
     * Adds a `<script>` tag into the page with the desired url or content
     *
     * @param {object} options
     * @param {string} [options.path]    Path to the JavaScript file to be injected into frame.
     *                                   If path is a relative path, then it is resolved relative to current working directory.
     * @param {string} [options.url]     URL of a script to be added
     * @param {string} [options.content] Raw JavaScript content to be injected into frame
     *
     * @return {Promise} which resolves to the added tag when the script's onload fires
     *                   or when the script content was injected into frame
     */
    async addScriptTag({path, url, content}) {

        if ( path )  url = Path.resolve( path );

        var JS = this.document.createElement('script');

        JS[url ? 'src' : 'text'] = url || content;

        this.document.head.appendChild( JS );
    }

    /**
     * This method fetches an element with selector and focuses it.
     * If there's no element matching selector, the method throws an error.
     *
     * @param {string} selector - A selector of an element to focus.
     *                            If there are multiple elements satisfying the selector,
     *                            the first will be focused.
     * @return {Promise} Promise which resolves when the element matching selector is successfully focused.
     *                   The promise will be rejected if there is no element matching selector.
     */
    async focus(selector) {

        this.document.querySelector( selector ).focus();
    }

    async elementOf(expression) {

        return  this.document.all(await this.evaluate(`${expression}.sourceIndex`));
    }

    async trigger(target,  type,  name,  bubble,  cancel,  more = { }) {

        const document = this.document;

        if (typeof target === 'string')
            target = document.querySelector( target );
        else if (target instanceof Array)
            target = await this.elementOf( `document.elementFromPoint(${ target })` );

        const event = document.createEvent( type );

        event.initEvent(name, bubble, cancel);

        return  await new Promise((resolve) => {

            setTimeout(() => resolve(
                target.dispatchEvent( Object.assign(event, more) )
            ));
        });
    }

    async centerOf(selector) {

        const BCR = await this.evaluate(function (selector) {

            var BCR = document.querySelector( selector ).getBoundingClientRect();

            return {
                left:      BCR.left,
                right:     BCR.right,
                top:       BCR.top,
                bottom:    BCR.bottom,
                width:     BCR.width,
                height:    BCR.height
            };
        },  selector);

        return  [BCR.left + BCR.width / 2,  BCR.top + BCR.height / 2];
    }

    /**
     * This method fetches an element with selector, scrolls it into view if needed,
     * and then uses page.mouse to hover over the center of the element.
     *
     * If there's no element matching selector, the method throws an error.
     *
     * @param {string} selector - A selector to search for element to hover.
     *                            If there are multiple elements satisfying the selector,
     *                            the first will be hovered.
     * @return {Promise} Promise which resolves when the element matching selector is successfully hovered.
     *                   Promise gets rejected if there's no element matching selector.
     */
    async hover(selector) {

        const target = this.document.querySelector( selector );

        target.scrollIntoView();

        const center = await this.centerOf( selector );

        this.mouse.move(center[0], center[1]);
    }

    /**
     * This method fetches an element with selector, scrolls it into view if needed,
     * and then uses `page.mouse` to click in the center of the element.
     * If there's no element matching selector, the method throws an error.
     *
     * Bare in mind that if `.click()` triggers a navigation event
     * and there's a separate `page.waitForNavigation()` promise to be resolved,
     * you may end up with a race condition that yields unexpected results.
     *
     * @param {string} selector - A selector to search for element to click.
     *                            If there are multiple elements satisfying the selector,
     *                            the first will be clicked.
     * @param {object} [options]
     * @param {string} [options.button='left'] `left`, `right`, or `middle`
     * @param {number} [options.clickCount=1]  {@link https://developer.mozilla.org/en-US/docs/Web/API/UIEvent/detail|UIEvent.detail}
     * @param {number} [options.delay=0]       Time to wait between `mousedown` and `mouseup` in milliseconds
     *
     * @return {Promise} Promise which resolves when the element matching selector is successfully clicked.
     *                   The Promise will be rejected if there is no element matching selector.
     */
    async click(selector,  options = {button: 'left', clickCount: 1, delay: 0}) {

        const target = this.document.querySelector( selector );

        target.scrollIntoView();

        const center = await this.centerOf( selector );

        await this.mouse.click(center[0], center[1], options);

        target.click();
    }
}

module.exports = Page;
