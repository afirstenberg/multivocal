
module.exports = (config) => {
  return{

    get: () => {
      return Promise.resolve( config );
    }

  }
};