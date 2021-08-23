const assert = require( "assert" );
const Util = require( '../lib/util' );

let obj = {};

Util.setObjPath( obj, 'a', 1 );
assert.equal( obj.a, 1 );

Util.setObjPath( obj, 'b/c', 2 );
assert.equal( obj.b.c, 2 );

Util.setObjPath( obj, 'b/d/e/f', 3 );
assert.equal( obj.b.d.e.f, 3 );

Util.setObjPath( obj, 'c[+]', 1 );
assert.equal( obj.c[0], 1 );
Util.setObjPath( obj, 'c[+]', 2 );
assert.equal( obj.c[1], 2 );
Util.setObjPath( obj, 'c[+]', 3 );
assert.equal( obj.c[2], 3 );
Util.setObjPath( obj, 'c[0]', 10 );
assert.equal( obj.c[0], 10 );
Util.setObjPath( obj, 'c[=]', 11 );
assert.equal( obj.c[2], 11 );

Util.setObjPath( obj, 'd[+][+]', 1 );
assert.ok( Array.isArray( obj.d ) );
assert.ok( Array.isArray( obj.d[0]) );
assert.equal( obj.d[0][0], 1 );

Util.setObjPath( obj, 'e[+][+]/a/b', 5 );
assert.equal( obj.e[0][0].a.b, 5 );

console.log(JSON.stringify(obj,null,1));