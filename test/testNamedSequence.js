
const {NamedSequence, NamedFunctionSequence} = require('../lib/namedSequence');

const seq = new NamedSequence();
seq.add('a');
seq.add({After:'x', foo:'b'});

seq.forEach( item => {
  console.log(item);
})

console.log(seq.names());

const f = new NamedFunctionSequence();
const env = {};
f.add( env => console.log('a') );
f.add( {After:'First', Name:'Bravo', fn:env => console.log('b')} );
f.exec(env)
  .then( env => console.log(f.names()) );
