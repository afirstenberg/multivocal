
const objectAssignDeep = require(`object-assign-deep`);

module.exports = (configs) => {
  if( !Array.isArray( configs ) ){
    configs = [configs];
  }

  return{

    get: () => {

      var configPromises = configs.map( config => config.get() );

      return Promise.all( configPromises )
        .then( vals => objectAssignDeep.noMutate.apply( null, vals ) )
        .then( ret => Promise.resolve( ret ) );
    }

  }
};