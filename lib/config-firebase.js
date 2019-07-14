const admin     = require('firebase-admin');
const functions = require('firebase-functions');

/**
 *
 * @param fb
 * @param options
 * @returns {Object} A Configuration that updates its data from Firebase.
 */
module.exports = function( fb, options ){
  options = Object.assign( {}, {
    addToMultivocal: true,
    ignoreCache: false
  }, (options || {}) );

  fb = Object.assign( {}, {
    config: functions.config().firebase,
    name:   undefined,
    path:   'multivocal'
  }, (fb || {}) );
  this.fb = fb;

  this.val = undefined;
  this.updated = 0;

  // Initialize the app if we need to
  try{
    this.app = admin.app( fb.name );
  } catch( xx ){
    // Default database not configured yet, so do so
    this.app = admin.initializeApp( fb.config, fb.name );
    //console.log('initialized', JSON.stringify(fb,null,1));
  }
  this.db = admin.database( this.app );
  this.ref = this.db.ref( fb.path );

  var promiseVal = () => {
    var ret = Object.assign( {}, this.val || {} );
    return Promise.resolve( ret );
  };

  var setSnapshot = (snapshot) => {
    var val = snapshot.val();
    this.val = cleanCopy( val );
    this.updated = Date.now();
    //console.log('setSnapshot',JSON.stringify(this.val,null,2));
    console.log('config-firebase setSnapshot',this.updated);
    return promiseVal();
  };

  this.shouldGet = (lastUpdate) => {
    console.log('config-firebase shouldGet', this.updated, lastUpdate, this.updated > lastUpdate);
    return options.ignoreCache && (this.updated > lastUpdate)
  };

  this.get = () => {
    //console.log( 'ConfigFirebase val', this.val );
    if( this.val ){
      return promiseVal();
    } else {
      return this.load();
    }
  };

  this.load = () => {
    //console.log( 'ConfigFirebase load' );
    return this.ref.once('value')
      .then( snapshot => setSnapshot( snapshot ) )
      .catch( err => {
        console.error( 'Warning: Problem loading from firebase.', err );
        return Promise.reject( err );
      });
  };

  // Register a callback that will get updates when the database changes
  this.ref.on('value', snapshot => {
    console.log( 'Config updated from firebase' );
    setSnapshot( snapshot );
  });

  if( options.addToMultivocal ){
    const Multivocal = require('./multivocal');
    Multivocal.addConfig( this );
  }

  return this;
};

var cleanCopy = function( obj ){
  if( typeof obj !== 'object' ){
    return obj;
  } else if( Array.isArray( obj ) ){
    return obj.map( e => cleanCopy(e) );
  }

  var ret = {};

  var keys = Object.keys( obj );
  for( var co=0; co<keys.length; co++ ){
    var key = keys[co];
    var val = obj[key];
    var cleanKey = key.replace( /_/g, '.' ).replace( /\|/g, '/' );
    var cleanVal = cleanCopy( val );
    ret[cleanKey] = cleanVal;
  }

  return ret;
};
