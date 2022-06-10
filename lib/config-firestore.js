const admin     = require('firebase-admin');
const functions = require('firebase-functions');

/**
 *
 * @param fb
 * @param options
 * @returns {Object} A Configuration that updates its data from Firestore.
 */
module.exports = function( fb, options ){
  options = Object.assign( {}, {
    addToMultivocal: true,
    ignoreCache: false
  }, (options || {}) );

  fb = Object.assign( {}, {
    config:     functions.config().firebase,
    name:       undefined,
    collection: 'config',
    document:   'multivocal'
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
  this.db = admin.firestore( this.app );
  this.ref = this.db.collection( fb.collection ).doc( fb.document );

  var promiseVal = () => {
    var ret = Object.assign( {}, this.val || {} );
    return Promise.resolve( ret );
  };

  var setSnapshot = (snapshot) => {
    this.val = snapshot.data();
    this.updated = Date.now();
    //console.log('setSnapshot',JSON.stringify(this.val,null,2));
    return promiseVal();
  };

  this.shouldGet = (lastUpdate) => {
    return options.ignoreCache || (this.updated > lastUpdate)
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
    return this.ref.get()
      .then( snapshot => setSnapshot( snapshot ) )
      .catch( err => {
        console.error( 'Warning: Problem loading from firestore.', err );
        return Promise.reject( err );
      });
  };

  // Register a callback that will get updates when the database changes
  this.ref.onSnapshot( snapshot => setSnapshot( snapshot ) );

  if( options.addToMultivocal ){
    const {addConfig} = require( "./multivocalConfig" );
    addConfig( this );
  }

  return this;
};

