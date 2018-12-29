
const objectAssignDeep = require(`object-assign-deep`);

module.exports = function( configs, options ){
  options = Object.assign( {}, {
    addToMultivocal: true
  }, (options || {}));
  if( typeof configs == 'undefined' ){
    configs = [];
  }
  if( !Array.isArray( configs ) ){
    configs = [configs];
  }

  var ret = {

    get: () => {

      var configPromises = configs.map( config => config.get() );

      return Promise.all( configPromises )
        .then( vals => objectAssignDeep.noMutate.apply( null, vals ) )
        .then( ret => Promise.resolve( ret ) );
    },

    add: config => {
      configs.push( config );
      var len = configs.length;
      config.get().then( conf => {
        //console.log( 'config-merge add', len, conf );
      });
    }

  };

  if( options.addToMultivocal ){
    const Multivocal = require('./multivocal');
    Multivocal.addConfig( ret );
  }

  return ret;
};