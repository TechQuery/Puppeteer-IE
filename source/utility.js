'use strict';

exports.waitFor = function (timeOut = 30000,  filter,  notNull) {

    if (timeOut instanceof Function)
        filter = timeOut,  timeOut = 30000;
    else
        filter = (filter instanceof Function)  &&  filter;

    return  new Promise(function (resolve, reject) {

        var start = Date.now();

        setTimeout(async function check() {

            if (timeOut  &&  ((Date.now() - start)  >=  timeOut))
                return  filter  ?  reject(`Timeout - ${timeOut}ms`)  :  resolve();

            if ( filter ) {

                let result = await filter();

                if ( notNull ) {

                    if (result != null)  return  resolve( result );

                } else if ( result )  return  resolve( result );
            }

            setTimeout( check );
        });
    });
};


exports.proxyCOM = function (target) {

    const getter = { };

    for (let key  of  target.__type)
        if (
            (key.invkind === 2)  &&  (target[ key.name ] != null)  &&
            (target[ key.name ].__value !== '[object]')
        )
            getter[ key.name ] = 1;

    return  new Proxy(target, {
        get:    function (target, name) {

            target = target[ name ];

            return  (name in getter)  ?  target.valueOf()  :  target;
        },
        set:    function (target, name, value) {

            target[ name ] = value;

            return true;
        }
    });
};
