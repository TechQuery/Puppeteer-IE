'use strict';

exports.waitFor = function (timeOut = 30000,  filter) {

    if (timeOut instanceof Function)
        filter = timeOut,  timeOut = 30000;
    else
        filter = (filter instanceof Function)  &&  filter;

    return  new Promise(function (resolve, reject) {

        var start = Date.now();

        setTimeout(async function check(result) {

            if (timeOut  &&  ((Date.now() - start)  >=  timeOut))
                return  filter  ?  reject(`Timeout - ${timeOut}ms`)  :  resolve();

            if (filter  &&  (result = await filter()))
                return  resolve( result );

            setTimeout( check );
        });
    });
};
