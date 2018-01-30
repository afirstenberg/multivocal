
const Template = require( './template' );

var get = function( env, responseNames, responseField, responseDefault ){
  responseField = responseField || 'Response';
  responseDefault = responseDefault || {
    TemplateEnvMap: {
      "Template": "Msg"
    }
  };

  // Get all of the responses for this intent or action (or default)
  return getResponses( env, responseNames )

    // Filter them to those that match
    .then( allResponses => {
      return filterResponses( env, allResponses );
    })

    // Pick one of the remaining responses
    .then( responses => {
      return pickResponse( responses );
    })

    // Save this to the environment and build messages from our templates
    // that get saved to the environment.
    .then( response => {
      env[responseField] = Object.assign( {}, responseDefault, response );
      return rebuildMessages( env, env[responseField] );
    })

    .catch( err => {
      console.error( 'Response.get err', err );
      return Promise.reject( err );
    });
};
exports.get = get;

var getResponses = function( env, responseNames ){
  var ret;
  var name;
  var path;
  var pathElements;
  for( var co=0; co<responseNames.length && !ret; co++ ){
    path = responseNames[co];
    if( path ){
      pathElements = path.split('/');
      ret = env.Config;
      for( var c1=0; c1<pathElements.length && ret; c1++ ){
        name = pathElements[c1];
        ret = ret[name];
      }
    }
  }
  console.log( 'Response getResponses name', responseNames, '->', path, '=', ret );
  return Promise.resolve( ret );
};

var filterResponses = function( env, allResponses ){
  var ret = [];

  var len = allResponses ? allResponses.length : 0;
  for( var co=0; co<len; co++ ){
    var response = allResponses[co];
    if( typeof response !== 'object' ){
      // If we just have the response, add it to the list
      ret.push( {
        Template: response,
        Index: co
      } );

    } else if( !response.Criteria ){
      // If there is no criteria, add it to the list
      response.Index = co;
      ret.push( response );

    } else {
      // Evaluate the criteria. If it evaluates to true, add it to the list
      var shouldAdd = Template.evalBoolean( response.Criteria, env );
      if( shouldAdd ){
        response.Index = co;
        ret.push( response );
      }

    }
  }

  //console.log( 'filterResponses ret', ret );
  return Promise.resolve( ret );
};

var pickResponse = function( responses ){
  var size = responses.length;
  if( size == 0 ){
    return Promise.resolve( {} );
  }

  var index = Math.floor( Math.random() * size );
  console.log( 'Response pickResponse index', index );
  return Promise.resolve( responses[index] );
};

var buildMessages = function( env, response ){
  var ret = {};
  Object.assign(
    ret,
    executeMessages( env, response, response.TemplateEnvMap, Template.execute )
  );
  return Promise.resolve( ret );
};

var rebuildMessages = function( env, response ){
  response = response || env.Response;
  return buildMessages( env, response )

    // Save these messages to the environment and return the environment
    .then( msgs => {
      Object.assign( env, msgs );
      return Promise.resolve( env );
    })

    .catch( err => {
      console.log( 'Response rebuildMessages err', err );
      return Promise.reject( err );
    });
};
exports.rebuildMessages = rebuildMessages;

var executeMessages = function( env, response, map, templateExec ){
  var ret = {};
  var keys = Object.keys( map );
  for( var co=0; co<keys.length; co++ ){
    var templateName = keys[co];

    var template = response[templateName];
    if( template !== undefined ){
      var resultValue = templateExec( template, env );

      var resultName = map[templateName];
      ret[resultName] = resultValue;
    }
  }
  return ret;
};