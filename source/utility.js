'use strict';

exports.waitFor = function (timeOut = 30000,  filter = () => { }) {

    if (timeOut instanceof Function)  filter = timeOut,  timeOut = 30000;

    return  new Promise(function (resolve, reject) {

        var start = Date.now();

        setTimeout(function check(result) {

            if (timeOut  &&  ((Date.now() - start)  >=  timeOut))
                return  reject(`Timeout - ${timeOut}ms`);

            (result = filter())  ?  resolve( result )  :  setTimeout( check );
        });
    });
};
