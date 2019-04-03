
var Util = require('./util');

var multivocal = require('debug')('multivocal');

var Level = {
  all:   {val:  0, func: console.log},
  debug: {val: 10, func: console.log},
  info:  {val: 30, func: console.log},
  warn:  {val: 50, func: console.error},
  error: {val: 70, func: console.error},
  fatal: {val: 90, func: console.error},
  none:  {val:100, func: console.error}
};

var logLevel = Level.info;

var config = function( env ){
  let level = Util.setting( env, 'Log/Level' );
  if( typeof level !== 'undefined' ){
    logLevel = level;
  }

  let modules = Util.setting( env, 'Log/Modules' );
  if( modules ){
    multivocal.enable(modules);
  }

  info('log', 'Logging %s at level %s', modules, logLevel);

  return Promise.resolve( env );
};
exports.config = config;

var levelValStr = function( level ){
  let ret = parseInt( level, 10 );
  if( isNaN(ret) ){
    ret = (Level[level] && (typeof Level[level].val !== 'undefined')) ? Level[level].val : Level.none.val;
  }
  return ret;
};

var levelVal = function( level = logLevel ){
  switch( typeof level ){
    case 'object': return level.val;
    case 'number': return level;
    case 'string': return levelValStr( level );
    default:       return Level.none.val;
  }
};

var log = function( level, component, params ){
  // Only log at or above our log level
  var minLevel = levelVal();
  if( level.val < minLevel ) return;

  // Only log if the component is enabled
  var l = multivocal.extend( component );
  if( !l.enabled ) return;

  // Set the console logging function to use
  var func = level.func;
  if( typeof func !== 'function' ){
    func = console.error;
  }
  l.log = func.bind( console );

  // Log
  l.apply( null, params );
};

var debug = function( component, ...params ){
  log( Level.debug, component, params );
};
exports.debug = debug;

var info = function( component, ...params ){
  log( Level.info, component, params );
};
exports.info = info;

var warn = function( component, ...params ){
  log( Level.warn, component, params );
};
exports.warn = warn;

var error = function( component, ...params ){
  log( Level.error, component, params );
};
exports.error = error;

var fatal = function( component, ...params ){
  log( Level.fatal, component, params );
};
exports.fatal = fatal;
