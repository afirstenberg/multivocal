
const Jwt = require('jsonwebtoken');
const jwkToPem = require('jwk-to-pem');

const google = {
  "keys": [
    {
      "kty": "RSA",
      "alg": "RS256",
      "use": "sig",
      "kid": "029f269f3f06af1e93dac67063977f713a77f19e",
      "n": "ujZC65vhdzixsd8qTsOQ3ho0_KUUrb7xlkhCPsDVFjwCQUtwS57QjM_U4HfYDBMVchcHAHjOoaxsCddqjtHmA2mOAaaPESEh1w37Dq9pgF06FOniB0BFDWv-oE8qwE8KUczqa4b6wnuqTa7aHYPg-PFvuXLEsmS23Fsxyklhpa1bLT8fpJk2gjwVI6QRiNX_QteSY96fsomHDImHfcnxuozcj1GO-3TE82r-3yNyWZ43KeCsKM6-HDWlKZto6dDIvyTZNucC32tfVEk_F7fC1epNbVsYbM5ITFn4Un7WSP7BC2_I0ZuQjxl48hA3FjggclK4nwE-5-OK_g4EUe0DKw",
      "e": "AQAB"
    },
    {
      "kty": "RSA",
      "alg": "RS256",
      "use": "sig",
      "kid": "3bcf0b3cc862a0ac77092f72b4dfdb20a8100df0",
      "n": "oV4G2mKC_EbVIOiqwP2yWY1zrXOkGoNz9T4tjzv1ht9h4fyMmQW8dTeVdlV1Qxal71NSQsBzIPfHl4U4Tz9ZiIh0DLQOHCVU6EjrBpZfYdHoWsR1mJT0fa4h63BOWVgWu76KFSESy5v15DMROXBDUo9-tThr9y9a1ssvCB1oPUv4heMJvJQsVM4Ua7ZVKXpzTEL17mY_qxTwSzfKPG6xwPWKnDMVJqgXyHQ9Z5FXPFx7g6JUZ5kT5EGl2-5BziIfXBpu8RGvaMPpldj486k9WgaUq8jJ7LQfN6YW0CrXS_lq6FKSV7SEw-vLCeiV3I-p5-8yKoLsbWoOd8UqH8sY1w",
      "e": "AQAB"
    },
    {
      "kty": "RSA",
      "alg": "RS256",
      "use": "sig",
      "kid": "a748e9f767159f667a0223318de0b2329e544362",
      "n": "tuhr2NvyeXM215R3uvFHL040vM_jQvynwALBRCO0GPy4TxicZmmIEr3nxRsv7c2KNTQUltaiImSocdUwCczQYtCokb9TIx225hqoD-3Mr6dmqkicMcdjqVgjShRzgcHX7c1ipi9r7YvePdOyQutr-SrT9qHFbC5B5CGrY5J3VsEq6wNVeFwto9utMbn7YmENMJp5ws3O3p7YkSrRAxdhzVefciUWD3E6PZrDlcNBUVjKX1lTWfpcfKAUVqUT0Kf2_A1QCqMr1Sjsj8PGeAMtslsK1N59QhwCAarNaEW1H02iFqSalJpgSlw-wN6XMyc1wnIBpstJrjnFwvN0jTe34w",
      "e": "AQAB"
    }
  ]
};

const sources = {
  "https://accounts.google.com":{
    "keys": google.keys,
    "aud": "335921910786-dv1roap4ntj01k44nhe9pu695lt9b8gl.apps.googleusercontent.com"
  }
};

var getUnverifiedInfo = function( token ){
  var unverified = Jwt.decode( token, {complete:true} );

  // Locate a source based on the issuing name
  var iss = unverified.payload.iss;
  var source = sources[iss];
  if( !source ){
    return Promise.reject(new Error(`No source matching "${iss}"`));
  }

  // Locate a key based on the key id
  var kid = unverified.header.kid;
  var key;
  for( var co=0; co<source.keys.length && (typeof key === "undefined"); co++ ){
    var potentialKey = source.keys[co];
    if( potentialKey.kid === kid ){
      key = potentialKey;
    }
  }
  if( !key ){
    return Promise.reject(new Error(`No key matching "${kid}" for source "${iss}"`));
  }
  var pem = jwkToPem( key );

  // If set, verify that the client auditing string for this source matches
  var audOk = false;
  var sourceAud = source.aud;
  if( sourceAud ){
    var claimAud = unverified.payload.aud;
    if( sourceAud !== claimAud ){
      return Promise.reject(new Error(`Claimed aud "${claimAud}" does not match aud for source "${iss}"`));
    }
    audOk = true;
  }

  // We're good! Return the info
  var ret = {
    iss: iss,
    key: key,
    pem: pem,
    aud: source.aud,
    audOk: audOk,
    token: token,
    unverifiedJwt: unverified
  };

  return Promise.resolve( ret );
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