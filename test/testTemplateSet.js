const Template = require('../lib/template');
const Util = require('../lib/util');

var env = {
  a: {
    b: {
      c: 1,
      d: 2
    }
  },
  arr: [2,4,6,10]
};

Util.setObjPath( env, 'm/n[+]/a', 1 );
Util.setObjPath( env, 'm/n[=]/b', 2 );

var t = [
  '{{Set "_This[+]/a" 24}}',
  '{{Set "_This[=]/b" 21}}',
  '{{Set "_This[+]/a" 34}}',
  '{{Set "_This[=]/b" 31}}',
  '{{#Set "_This[+]"}}',
  'a-b',
  '{{/Set}}'
];

var v = Template.eval( t, env );
console.log( v );

t = [
  '{{#each arr}}',
  '{{Set "_This[+]/title" this}}',
  '{{/each}}'
];
var a = Template.eval( t, env );
console.log(a);

//console.log( JSON.stringify(env,null,1) );
