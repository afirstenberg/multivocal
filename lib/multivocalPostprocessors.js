const Timing = require( "./timing" );
const Util = require( "./util" );

var postprocessors = [];

var addPostprocessor = function( func ){
  postprocessors.push( func );
};
exports.addPostprocessor = addPostprocessor;

var postprocessTimer = function( env ){
  let now = Date.now();
  return Timing.timingBlocks( env )
    .then( env => {
      // Sort them by end time ascending (later times last)
      let timing = env.Timing.Blocks.slice();
      timing.sort( (a,b) => {
        let as = a.End ? a.End : now;
        let bs = b.End ? b.End : now;
        let ret = as-bs;

        // If they end at the same time, use how long they've been recording
        if( !ret ){
          as = a.Diff ? a.Diff : 0;
          bs = b.Diff ? b.Diff : 0;
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
addPostprocessor( postprocessTimer );

var postprocess = function( env ){
  return Timing.begin( env, 'Postprocess' )
    .then( env => Util.envFunctionsRecursive( env, postprocessors ) )
    .then( env => Timing.end( env, 'Postprocess') )
    .catch( err => {
      console.error( 'Problem during postprocessing', err );
      return Promise.reject( err );
    });
};
exports.postprocess = postprocess;
