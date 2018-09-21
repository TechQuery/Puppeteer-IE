'use strict';

const { waitFor } = require('./utility');


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

    isSameElement(pointA, pointB) {

        return  this._page.evaluate(
            (A, B)  =>  document.elementFromPoint(A[0], A[1]).isSameNode(
                document.elementFromPoint(B[0], B[1])
            ),
            pointA,
            pointB
        );
    }

    trigger(name,  bubble,  cancel,  options = { }) {

        const page = this._page;

        return page.trigger(
            [this._x,  this._y],
            'Mouse',  'mouse' + name,  bubble,  cancel,
            page.document.defaultView, options.clickCount,
            page.window.screenLeft + this._x,  page.window.screenTop + this._y,
            this._x,  this._y,
            false, false, false, false,
            ['left', 'middle', 'right'].indexOf( options.button ),
            null
        );
    }

    async moveTo(x, y) {

        if (! await this.isSameElement([this._x, this._y],  [x, y])) {

            await this.trigger('out', true, true);

            await this.trigger('leave', false, false);

            this._x = x,  this._y = y;

            await this.trigger('over', true, true);

            await this.trigger('enter', false, false);
        }

        this._x = x,  this._y = y;

        await this.trigger('move', true, true);
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

        return  this.trigger('down', true, true, options);
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

        return  this.trigger('up', true, true, options);
    }

    /**
     * @param {number} x
     * @param {number} y
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

        if ( options.delay )  await waitFor( options.delay );

        await this.up( options );
    }
}

module.exports = Mouse;
