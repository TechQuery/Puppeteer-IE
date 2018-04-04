'use strict';

const Utility = require('./utility');


class Mouse {
    /**
     * @constructs
     *
     * @param {Page} page - The page which this mouse cursor points to
     */
    constructor(page) {

        this._page = page;

        this._x = this._y =  0;

        this._button = 'none';
    }

    static makeEvent(options) {

        return {
            detail:    options.clickCount,
            button:    ['left', 'middle', 'right'].indexOf( options.button )
        };
    }

    async moveTo(x, y) {

        const page = this._page, last = [this._x, this._y], next = [x, y];

        if (! await page.isSameElement(last, next)) {

            await page.trigger(last, 'MouseEvent', 'mouseout', true, true);

            await page.trigger(last, 'MouseEvent', 'mouseleave', false, false);

            await page.trigger(next, 'MouseEvent', 'mouseover', true, true);

            await page.trigger(next, 'MouseEvent', 'mouseenter', false, false);
        }

        await page.trigger(next, 'MouseEvent', 'mousemove', true, true);

        this._x = x,  this._y = y;
    }

    /**
     * Dispatches a `mousemove` event
     *
     * @param {number} x
     * @param {number} y
     * @param {object} [options]
     * @param {number} options.steps=1 - Sends intermediate `mousemove` events
     *
     * @return {Promise}
     */
    async move(x,  y,  options = {steps: 1}) {

        const delta = {
            x:    (x - this._x)  /  options.steps,
            y:    (y - this._y)  /  options.steps
        };

        for (let i = 1;  i <= options.steps;  i++)
            await this.moveTo(this._x + delta.x,  this._y + delta.y);
    }

    /**
     * Dispatches a `mousedown` event
     *
     * @param {object} [options]
     * @param {string} [options.button='left'] `left`, `right`, or `middle`
     * @param {number} [options.clickCount=1]  {@link https://developer.mozilla.org/en-US/docs/Web/API/UIEvent/detail|UIEvent.detail}
     *
     * @return {Promise}
     */
    down(options = {button: 'left', clickCount: 1}) {

        return  this._page.trigger(
            [this._x, this._y],
            'MouseEvent',  'mousedown',  true,  true,
            Mouse.makeEvent( options )
        );
    }

    /**
     * Dispatches a `mouseup` event
     *
     * @param {object} [options]
     * @param {string} [options.button='left'] `left`, `right`, or `middle`
     * @param {number} [options.clickCount=1]  {@link https://developer.mozilla.org/en-US/docs/Web/API/UIEvent/detail|UIEvent.detail}
     *
     * @return {Promise}
     */
    up(options = {button: 'left', clickCount: 1}) {

        return  this._page.trigger(
            [this._x, this._y],
            'MouseEvent',  'mouseup',  true,  true,
            Mouse.makeEvent( options )
        );
    }

    /**
     * @param {object} [options]
     * @param {string} [options.button='left'] `left`, `right`, or `middle`
     * @param {number} [options.clickCount=1]  {@link https://developer.mozilla.org/en-US/docs/Web/API/UIEvent/detail|UIEvent.detail}
     * @param {number} [options.delay=0]       Time to wait between `mousedown` and `mouseup` in milliseconds
     *
     * @return {Promise}
     */
    async click(x,  y,  options = {button: 'left', clickCount: 1, delay: 0}) {

        await this.move(x, y);

        await this.down( options );

        if ( options.delay )  await Utility.waitFor( options.delay );

        await this.up( options );
    }
}

module.exports = Mouse;
