
module.exports = function( config, options ){
  options = Object.assign( {}, {
    addToMultivocal: true
  }, (options || {}) );

  var ret = {

    get: () => {
      var ret = Object.assign( {}, config );
      return Promise.resolve( ret );
    }

  };

  if( options.addToMultivocal ){
    const Multivocal = require('./multivocal');
    Multivocal.addConfig( ret );
  }

  return ret;
};