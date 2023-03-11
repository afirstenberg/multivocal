const Timing = require( "./timing" );
const {NamedFunctionSequence} = require( "./namedSequence" );

const postprocessors = new NamedFunctionSequence({
  DefaultPosition: {Before: 'Timer'},
  Timing: 'Postprocess'
})

exports.addPostprocessor = postprocessors.add;

async function Timer( env ){
  let now = Date.now();
  return Timing.timingBlocks( env )
    .then( env => {
      // Sort them by end time ascending (later times last)
      let timing = env.Timing.Blocks.slice();
      timing.sort( (a,b) => {
        let as = a.End ? a.End : now;
        let bs = b.End ? b.End : now;
        let ret = as-bs;

        // If they end at the same time, the lower levels will sort last
        if( !ret ){
          as = a.Level || 0;
          bs = b.Level || 0;
          ret = bs-as;
        }

        // If they were the same level, the higher order will sort last
        if( !ret ){
          as = a.Order || 0;
          bs = b.Order || 0;
          ret = as-bs;
        }

        return ret;
      });

      // Display the results
      let results = 'timing results:\n';
      for( let co=0; co<timing.length; co++ ){
        var t = timing[co];
        results += ` ${'.'.repeat(t.Level-1)}${t.Label} ${t.Diff}ms\n`;
      }
      console.log( results );
      return Promise.resolve( env );
    });
};
postprocessors.add({
  Name: 'Timer',
  Before: 'Last',
  fn: Timer
})

async function postprocess( env ){
  env = await postprocessors.exec( env );
  return env
}
exports.postprocess = postprocess;
