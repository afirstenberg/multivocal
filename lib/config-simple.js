
module.exports = (config) => {
  return{

    get: () => {
      var ret = Object.assign( {}, config );
      return Promise.resolve( ret );
    }

  }
};