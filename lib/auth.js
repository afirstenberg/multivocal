
const Jwt = require('jsonwebtoken');
const jwkToPem = require('jwk-to-pem');
const objectAssignDeep = require('object-assign-deep');

const Util = require('./util');
const Template = require('./template');

var sources = {};

/**
 *
 * @param iss The iss value to match for the source
 * @param source Information about this source including:
 *               aud - The aud value to match (string or array)
 *               Keys - An array of keys to expect or
 *               KeysUrl - The URL containing the valid keys
 *
 * The source will get additional information added to it (including the Keys
 * if KeysUrl was specified and possible cache information about the keys).
 */
var addSource = function( iss, source ){
  // Check if we have a current source
  var currentSource = sources[iss];
  if( !currentSource ){
    currentSource = {
      iss: iss
    };
  }

  // If we have a current source, and the KeysUrl is different, reset the expiration
  if( currentSource.KeysUrl !== source.KeysUrl ){
    delete currentSource.Expires;
  }

  // Make a copy of the data and save it
  objectAssignDeep( currentSource, source );
  sources[iss] = currentSource;
};

var addSources = function( env, sourcesList ){
  if( !Array.isArray( sourcesList ) ){
    sourcesList = [sourcesList];
  }

  sourcesList.forEach( sourceName => {
    var sourceObject = Util.setting( env, `JWTAuth/${sourceName}` );
    if( sourceObject ){
      sourceObject = Template.evalObj( sourceObject, env );
      var issList = sourceObject.iss;
      if( issList ){
        if( !Array.isArray( issList ) ){
          issList = [issList];
        }
        issList.forEach( iss => {
          addSource( iss, sourceObject )
        })
      }
    }
  })
};
exports.addSources = addSources;

var updateSourceKeys = function( source ){
  var request = require('axios');
  var options = {
    url: source.KeysUrl,
    resolveWithFullResponse: true
  };
  return request( options )
    .then( response => {
      var body = response.data;

      var expiresStr = response.headers.expires;
      var expiresDate = Date.parse( expiresStr );
      var expires = expiresDate.valueOf();
      var now = Date.now();
      console.log('updateSourceKeys',expiresStr, expires, now);
      if( (!source.Keys) || now > expires ){
        console.log('updating keys');
        source.Keys = body.keys;
        source.Expires = expires;
      }
      return Promise.resolve( source );
    });
};

var possiblyUpdateSourceKeys = function( source ){
  return updateSourceKeys( source );
};

var getUnverifiedInfoSourceRaw = function( unverified ){
  // Locate a source based on the issuing name
  var iss = unverified.payload.iss;
  var source = sources[iss];
  if( !source ){
    return Promise.reject(new Error(`No source matching "${iss}"`));
  }
  return Promise.resolve( source );
};

var getUnverifiedInfoSource = function( unverified ){
  return getUnverifiedInfoSourceRaw( unverified )
    .then( source => possiblyUpdateSourceKeys( source ) );
};

var getUnverifiedInfoKey = function( unverified, source ){
  // Locate a key based on the key id
  var kid = unverified.header.kid;
  var key;
  for( var co=0; co<source.Keys.length && (typeof key === "undefined"); co++ ){
    var potentialKey = source.Keys[co];
    if( potentialKey.kid === kid ){
      key = potentialKey;
    }
  }
  if( !key ){
    return Promise.reject(new Error(`No key matching "${kid}" for source "${iss}"`));
  }
  return Promise.resolve( key );
};

var getUnverifiedInfoVerification = function( unverified, source ){
  // If set, verify that the client auditing string for this source matches
  var audOk = false;
  var sourceAud = source.aud;
  if( sourceAud ){
    if( !Array.isArray( sourceAud ) ){
      sourceAud = [sourceAud];
    }
    var claimAud = unverified.payload.aud;
    if( sourceAud.indexOf( claimAud ) === -1 ){
      return Promise.reject(new Error(`Claimed aud "${claimAud}" does not match aud for source "${source.iss}" (${source.aud})`));
    }
    audOk = true;
  }
  return Promise.resolve( audOk );
};

var getUnverifiedInfo = function( token ){
  var unverified = Jwt.decode( token, {complete:true} );
  var source;
  var key;
  var pem;
  var audOk = false;

  return getUnverifiedInfoSource( unverified )
    .then( sourceResult => {
      source = sourceResult;
      return getUnverifiedInfoKey( unverified, source );
    })
    .then( keyResult => {
      key = keyResult;
      pem = jwkToPem( key );
      return getUnverifiedInfoVerification( unverified, source );
    })
    .then( audOkResult => {
      audOk = audOkResult;

      // We're good! Return the info
      var ret = {
        iss: unverified.payload.iss,
        key: key,
        pem: pem,
        aud: unverified.payload.aud,
        audOk: audOk,
        token: token,
        unverifiedJwt: unverified
      };

      return Promise.resolve( ret );
    });
};

var verifyInfo = function( info ){
  var token = info.token;
  var key = info.pem;
  var options = {
  };
  return new Promise((resolve,reject) => {
    Jwt.verify( token, key, options, function( err, decoded ){
      if( err ){
        reject( err );
      } else {
        resolve( decoded );
      }
    })
  });
};

var verify = function( token ){
  return getUnverifiedInfo( token )
    .then( info => verifyInfo(info) )
    .then( decoded => Promise.resolve( decoded ) )
    .catch( err => {
      console.error('Problem verifying',err);
      return Promise.reject( err );
    });
};

exports.verify = verify;
