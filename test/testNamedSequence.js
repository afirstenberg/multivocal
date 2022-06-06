
const {NamedSequence, NamedFunctionSequence} = require('../lib/namedSequence');

const seq = new NamedSequence();
seq.add('a');
seq.add({After:'x', foo:'b'});

seq.forEach( item => {
  console.log(item);
})

console.log(seq.names());

function blah(env){env.blah='blah'; return env;}

const f = new NamedFunctionSequence();
const env = {x:'x'};
f.add( env => env.a = 'a' );
f.add( blah );
f.add( {After:'First', Name:'Bravo', fn:env => console.log('b')} );
f.exec(env)
  .then( env => console.log('done',env) )
  .then( env => console.log(f.names()) );
