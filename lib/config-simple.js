
module.exports = function( config, options ){
  options = Object.assign( {}, {
    addToMultivocal: true,
    ignoreCache: false
  }, (options || {}) );

  this.lastGet = 0;

  this.shouldGet = (lastUpdate) => {
    return options.ignoreCache || this.lastGet === 0;
  };

  this.get = () => {
    var ret = Object.assign( {}, config );
    this.lastGet = Date.now();
    return Promise.resolve( ret );
  };

  if( options.addToMultivocal ){
    const Multivocal = require('./multivocal');
    Multivocal.addConfig( this );
  }

  return this;
};