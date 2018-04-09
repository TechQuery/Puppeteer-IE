'use strict';

const EventEmitter = require('events'), Path = require('path');

const WinAX = require('winax'), Cookie = require('cookie');

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
            if (
                (key.invkind === 2)  &&  (COM[ key.name ] != null)  &&
                (COM[ key.name ].__value !== '[object]')
            )
                getter[ key.name ] = 1;

        return  new Proxy(COM, {
            get:    function (target, name) {

                target = target[ name ];

                return  (name in getter)  ?  target.valueOf()  :  target;
            },
            set:    function (target, name, value) {

                target[ name ] = value;

                return true;
            }
        });
    }

    static wrapScript(expression, parameter) {

        return  (expression instanceof Function) ?
            `(${expression})(${
                parameter.filter(
                    value  =>  (value !== undefined)
                ).map(
                    item  =>  JSON.stringify( item )
                )
            })` :
            `(function () { return ${expression}; })()`;
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
     * @param {number} [options.timeout=30000] Maximum navigation time in milliseconds,
     *                                         pass 0 to disable timeout.
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
     * @param {string} [url='about:blank']        URL to navigate page to.
     *                                            The url should include scheme, e.g. https://.
     * @param {object} [options]
     * @param {number} [options.timeout=30000]    Maximum navigation time in milliseconds,
     *                                            pass 0 to disable timeout.
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
     * @param {number} [options.timeout=30000]    Maximum navigation time in milliseconds,
     *                                            pass 0 to disable timeout.
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
     * @param {number} [options.timeout=30000]    Maximum navigation time in milliseconds,
     *                                            pass 0 to disable timeout.
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
     * @param {number} [options.timeout=30000]    Maximum navigation time in milliseconds,
     *                                            pass 0 to disable timeout.
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

    get cookie() {

        return  Cookie.parse(this.document.cookie + '');
    }

    set cookie(object) {

        for (let name in object)
            if (typeof object[ name ] === 'string')
                this.document.cookie = Cookie.serialize(name, object[name]);
            else {
                let option = object[ name ], value = object[ name ].value;

                delete option.name;  delete option.value;  delete option.url;

                this.document.cookie = Cookie.serialize(name, value, option);
            }
    }

    mapURL(list, filter) {

        return  Promise.all(list.map(async (url, index) => {

            if (url !== this.url()) {

                var page = new Page();

                await page.goto( url );
            }

            var result = filter.call(page || this,  url,  index,  list);

            if ( page )  page.close();

            return result;
        }));
    }

    /**
     * If no URLs are specified, this method returns cookies for the current page URL.
     * If URLs are specified, only cookies for those URLs are returned.
     *
     * @param {string} urls
     *
     * @return {Promise<Array<Object>>} Include keys of `name`, `value`, `domain`, `path`,
     *                                  `expires`, `httpOnly`, `secure`, `session` & `sameSite`.
     */
    cookies(...urls) {

        if (! urls[0])  urls.push( this.url() );

        return this.mapURL(
            urls,  Object.getOwnPropertyDescriptor(Page.prototype, 'cookie').get
        );
    }

    groupCookie(list) {

        const group = { };

        for (let cookie of list) {

            cookie.url = cookie.url || this.url();

            (group[ cookie.url ] = group[ cookie.url ]  || [ ]).push( cookie );
        }

        return group;
    }

    pushCookie(list, remove) {

        const group = this.groupCookie( list );

        return  this.mapURL(Object.keys( group ),  function (url) {

            const cookie = this.cookie;

            for (let item  of  group[ url ]) {

                if ( remove )  item.expires = Date.now() / 1000 - 1;

                if ( item.expires )
                    item.expires = new Date(item.expires * 1000);

                cookie[ item.name ] = item;
            }

            this.cookie = cookie;
        });
    }

    /**
     * @param {object}  cookies
     * @param {string}  cookies.name
     * @param {string}  cookies.value
     * @param {string}  [cookies.url]
     * @param {string}  [cookies.domain]
     * @param {string}  [cookies.path]
     * @param {number}  [cookies.expires]  Unix time in seconds
     * @param {boolean} [cookies.httpOnly]
     * @param {boolean} [cookies.secure]
     * @param {string}  [cookies.sameSite] "Strict" or "Lax"
     *
     * @return {Promise}
     */
    setCookie(...cookies) {

        return  this.pushCookie( cookies );
    }

    /**
     * @param {object}  cookies
     * @param {string}  cookies.name
     * @param {string}  [cookies.url]
     * @param {string}  [cookies.domain]
     * @param {string}  [cookies.path]
     * @param {boolean} [cookies.secure]
     *
     * @return {Promise}
     */
    deleteCookie(...cookies) {

        return  this.pushCookie(cookies, true);
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
     * If at the moment of calling the method the selector already exists,
     * the method will return immediately.
     * If the selector doesn't appear after the timeout milliseconds of waiting,
     * the function will throw.
     *
     * @param {string} selector                A selector of an element to wait for
     * @param {object} [options]
     * @param {number} [options.timeout=30000] Maximum time to wait for in milliseconds,
     *                                        pass 0 to disable timeout.
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

        expression = Page.wrapScript(expression, parameter);

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

    /**
     * @param {function|string} expression              Function or Expression to be evaluated in the page context
     * @param {object}          [options]
     * @param {number}          [options.timeout=30000] Maximum time to wait for in milliseconds,
     *                                                  pass 0 to disable timeout.
     * @param {Serializable}    [parameter]             Arguments to pass to the function
     *
     * @return {Promise} Promise which resolves when the function returns a truthy value
     */
    waitForFunction(expression,  options = {timeout: 30000},  ...parameter) {

        return Utility.waitFor(
            options.timeout,  this.evaluate.bind(this, expression, ...parameter)
        );
    }

    /**
     * @param {number|string|function} condition   A selector, predicate or timeout to wait for
     * @param {?object}                options
     * @param {Serializable}           [parameter] Arguments to pass to the function
     *
     * @return {Promise} Promise which resolves to a success value
     */
    waitFor(condition, options, ...parameter) {

        if (! isNaN( condition ))  return  Utility.waitFor( condition );

        return this[`waitFor${
            (condition instanceof Function)  ?  'Function'  :  'Selector'
        }`](condition,  options || { },  ...parameter);
    }

    /**
     * In the case of multiple pages in a single browser,
     * each page can have its own viewport size.
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
     * @return {Promise<object>} Include keys of `width`, `height`, `deviceScaleFactor`,
     *                           `isMobile`, `hasTouch` & `isLandscape`
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
     * Adds a `<link rel="stylesheet">` tag into the page with the desired url
     * or a `<style type="text/css">` tag with the content
     *
     * @param {object} options
     * @param {string} [options.path]    Path to the CSS file to be injected into frame.
     *                                   If path is a relative path,
     *                                   then it is resolved relative to current working directory.
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
     *                                   If path is a relative path,
     *                                   then it is resolved relative to current working directory.
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

    /**
     * @param {function|string} expression - Function or Expression to be evaluated in the page context
     * @param {Serializable}    parameter  - Arguments to pass to the function
     *
     * @return {Promise<ElementHandle>} Promise which resolves to the value of `expression` as **in-page Element**
     */
    async evaluateHandle(expression, ...parameter) {

        return Page.proxy(this.document.all(
            await this.evaluate(
                `${ Page.wrapScript(expression, parameter) }.sourceIndex`
            )
        ));
    }

    async trigger(target,  type,  name,  ...parameter) {

        const document = this.document;  type += 'Event';

        if (typeof target === 'string')
            target = document.querySelector( target );
        else if (target instanceof Array)
            target = await this.evaluateHandle( `document.elementFromPoint(${ target })` );

        const event = document.createEvent( type );

        try {
            event['init' + type](name,  ...parameter);
        } catch (error) {
            console.warn( parameter );
        }

        return  await new Promise((resolve) => {

            setTimeout( () => resolve( target.dispatchEvent( event ) ) );
        });
    }

    /**
     * Triggers a `change` and `input` event once all the provided options have been selected.
     * If there's no `<select>` element matching selector, the method throws an error.
     *
     * @param {string} selector - A selector to query page for
     * @param {string} values   - Values of options to select.
     *                            If the `<select>` has the `multiple` attribute,
     *                            all values are considered,
     *                            otherwise only the first one is taken into account.
     * @return {Promise<Array<string>>} Returns an array of option values
     *                                  that have been successfully selected
     */
    async select(selector, ...values) {

        const target = await this.$( selector );

        const options = target.children, selected = [ ];

        target.focus();

        for (let i = 0, option, value;  i < options.length;  i++) {

            option = options.item(i);  value = option.value + '';

            if (
                (option.selected = values.includes( value ))  &&
                selected.push( value )  &&  (! target.multiple)
            )
                break;
        }

        this.trigger(target, '', 'input', true, false);

        this.trigger(target, '', 'change', true, false);

        return selected;
    }

    /**
     * Sends a `keydown`, `keypress`/`input`, and `keyup` event
     * for each character in the text.
     *
     * @param {string} selector          A selector of an element to type into.
     *                                   If there are multiple elements satisfying the selector,
     *                                   the first will be used.
     * @param {string} text              A text to type into a focused element
     * @param {object} [options]
     * @param {number} [options.delay=0] Time to wait between key presses in milliseconds
     *
     * @return {Promise}
     */
    async type(selector,  text,  options = {delay: 0}) {

        const target = await this.$( selector );

        const key = (target.contentEditable || (target.designMode === 'on'))  ?
            'textContent'  :  'value';

        for (let i = 0;  text[i];  i++) {

            await this.trigger(
                target, 'Keyboard', 'keypress',
                true, true, null,
                false, false, false, false,
                0, text.charCodeAt(i)
            );

            target[ key ] += text[i];

            await this.trigger(target, '', 'input', true, false);

            if ( options.delay )  await Utility.waitFor( options.delay );
        }
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
