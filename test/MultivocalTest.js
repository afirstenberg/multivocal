var Multivocal = require( '../lib/multivocal' );

var processTestBody = function( headers, body ){
  var env = {
    Body: body,
    Req: {
      headers,
      body
    }
  };
  return Promise.resolve( env );
}

var processTestResponse = function( env ){
  //console.log( JSON.stringify( env, null, 1 ) );
  return Promise.resolve( env );
}

var processTest = function( headers, body ){
  return processTestBody( headers, body )
    .then( env => Multivocal.preprocess( env ) )
    .then( env => Multivocal.process( env ) )
    .then( env => processTestResponse( env ) )
    .then( env => Multivocal.postprocess( env ) );
}
exports.processTest = processTest;