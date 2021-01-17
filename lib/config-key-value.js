const Util = require('./util');

module.exports = function( config, options ){
  options = Object.assign( {}, {
    addToMultivocal: true,
    ignoreCache: false,
    parseJson: true,
    root: undefined,
    pathSeparator: undefined
  }, (options || {}) );

  if( typeof config === 'undefined' ){
    config = {};
  } else if( typeof config !== 'object' ){
    console.error('Configuration is not an object.',config);
    config = {value:config};
  }

  var processed = {};
  Object.keys( config ).forEach( key => {
    var val = config[key];
    if( options.parseJson ){
      try {
        val = JSON.parse(val);
      } catch( xx ){}
    }
    if( options.pathSeparator ){
      key = key.replace( options.pathSeparator, '/' );
    }
    Util.setObjPath( processed, key, val );
  })

  if( options.root ){
    this.ret = {};
    Util.setObjPath( this.ret, options.root, processed );
  } else {
    this.ret = processed;
  }

  this.lastGet = 0;

  this.shouldGet = (lastUpdate) => {
    return options.ignoreCache || this.lastGet === 0;
  };

  this.get = () => {
    this.lastGet = Date.now();
    return Promise.resolve( this.ret );
  };

  if( options.addToMultivocal ){
    const Multivocal = require('./multivocal');
    Multivocal.addConfig( this );
  }

  return this;
};