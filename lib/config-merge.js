
const objectAssignDeep = require(`object-assign-deep`);

module.exports = function( configs, options ){
  options = Object.assign( {}, {
    addToMultivocal: true,
    ignoreCache: false
  }, (options || {}));
  if( typeof configs == 'undefined' ){
    configs = [];
  }
  if( !Array.isArray( configs ) ){
    configs = [configs];
  }

  this.cache = undefined;
  this.updated = 0;

  this.shouldGet = (lastUpdate) => {
    console.log('config-merge shouldGet',options.ignoreCache, this.updated);
    if( options.ignoreCache || !this.updated || (this.updated > lastUpdate) ){
      return Promise.resolve(true);
    }

    var configPromises = configs.map( config => config.shouldGet(lastUpdate) );

    return Promise.all( configPromises )
      .then( shouldResults => {
        console.log('config-merge shouldGet', shouldResults);
        shouldResults.reduce( (ret,current) => ret || current )
      });
  };

  this.getIgnoringCache = () => {

    let start = Date.now();
    console.log('config-merge getIgnoringCache',this.updated);

    var configPromises = configs.map( config => config.get() );

    return Promise.all( configPromises )
      .then( vals => objectAssignDeep.noMutate.apply( null, vals ) )
      .then( ret => {
        this.cache = ret;
        this.updated = start;
        console.log(`config-merge getIgnoringCache completed ${Date.now() - this.updated}ms`);
        return Promise.resolve( ret )
      });
  };

  this.get = () => {
    return this.shouldGet( this.updated )
      .then( should => {
        if( should ){
          return this.getIgnoringCache();

        } else {
          console.log('config-merge get from cache');
          return this.cache;
        }
      })
  };

  this.add = (config) => {
    console.log('config-merge add',config);
    configs.push( config );
    var len = configs.length;
    config.get().then( conf => {
      //console.log( 'config-merge add', len, conf );
    });
  };

  if( options.addToMultivocal ){
    const Multivocal = require('./multivocal');
    Multivocal.addConfig( ret );
  }

  // Populate the cache
  this.get();

  return this;
};