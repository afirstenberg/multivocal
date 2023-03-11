
const source = {
  Simple:    require('./config-simple'),
  KeyValue:  require('./config-key-value'),
  Merge:     require('./config-merge'),
  Firebase:  require('./config-firebase'),
  Firestore: require('./config-firestore')
};
exports.source = source;

console.log('Creating Config');
var Config = new source.Merge( [], {addToMultivocal:false} );
exports.Config = Config;

var setConfig = function( conf ){
  Config = conf;
};
exports.setConfig = setConfig;

var addConfig = function( conf ){
  Config.add( conf );
};
exports.addConfig = addConfig;

var getConfig = function(){
  return Config.get();
};
exports.getConfig = getConfig;

new source.KeyValue( process.env, {root:'Process/Env'} );

const DefCon = new source.Simple( require( '../config/defcon.js' ), {addToMultivocal:false} );
exports.DefCon = DefCon;
