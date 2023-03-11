
const Multivocal = require('./multivocal');
const Util = require('./util');
const Config = require('./multivocalConfig')

var handleActionWelcome = function( env ){
  Util.incObjPath( env,    'User/State/NumVisits' );
  return Multivocal.handleDefault( env );
};

var handleActionRepeat = function( env ){
  return Multivocal.handleDefault( env )
    .then( env => {
      env.Response.ShouldRepeat = true;
      return Promise.resolve( env );
    });
};

var handleActionQuit = function( env ){
  return Multivocal.handleDefault( env )
    .then( env => {
      env.Response.ShouldClose = true;
      return Promise.resolve( env );
    });
};

exports.init = function(){
  new Config.source.Simple( require('../config/config-standard.js') );

  Multivocal.addActionHandler( 'multivocal.welcome', handleActionWelcome );
  Multivocal.addActionHandler( 'welcome',            handleActionWelcome );
  Multivocal.addActionHandler( 'multivocal.repeat',  handleActionRepeat );
  Multivocal.addActionHandler( 'multivocal.quit',    handleActionQuit );
  Multivocal.addActionHandler( 'quit',               handleActionQuit );

};