
const Template = require( './template' );
const Util = require( './util' );

const objectAssignDeep = require(`object-assign-deep`);

var getFromSettings = function( env, settingPath ){
  var responseNames = Util.setting( env, settingPath+'/Path', Template.Methods.Array );
  var responseField = Util.setting( env, settingPath+'/EnvField' );
  var responseBase  = Util.setting( env, settingPath+'/Base' );
  return get( env, responseNames, responseField, responseBase );
};
exports.getFromSettings = getFromSettings;

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
      return filterResponses( env, allResponses, responseDefault );
    })

    // Pick one of the remaining responses
    .then( responses => {
      return pickResponse( responses );
    })

    // Save this to the environment and build messages from our templates
    // that get saved to the environment.
    .then( response => {
      env[responseField] = Object.assign( {}, response );
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
  for( var co=0; co<responseNames.length && !ret; co++ ){
    path = responseNames[co];
    ret = Util.objPath( env, path );
  }
  console.log( 'Response getResponses name', path, '=', ret );
  return Promise.resolve( ret );
};

/**
 * Fields in the template that are arrays of all strings should have the
 * strings concatenated.
 * @param template
 * @returns {*}
 */
var cleanTemplate = function( template ){
  if( typeof template !== 'object' || Array.isArray( template ) ){
    return template;
  }

  var keys = Object.keys( template );
  for( var co=0; co<keys.length; co++ ){
    var key = keys[co];
    var val = template[key];
    if( Array.isArray( val ) ){
      var isStringElement = val.map( element => typeof element === 'string' );
      var allStrings = isStringElement.reduce( ((acc, e) => acc && e), true );
      if( allStrings ){
        val = val.join('');
        template[key] = val;
      }
    }
  }

  return template;
};

var filterResponses = function( env, allResponses, responseBaseDefault ){
  var ret = [];
  var responseBase;
  if( !responseBaseDefault ){
    responseBase = {};
  } else {
    responseBase = objectAssignDeep( {}, responseBaseDefault );
  }

  var len = allResponses ? allResponses.length : 0;
  for( var co=0; co<len; co++ ){
    var shouldAdd = true;

    // Get the response object we're working with
    var response = allResponses[co];
    if( typeof response !== 'object' ){
      response = {
        Template: {
          Text: response
        }
      };
    }
    response.Index = co;

    // If we reference another base, merge it with this response
    var baseRef = Util.objPathsDefault( response, 'Base/Ref' );
    if( baseRef ){
      var baseRefVal = Util.objPathsDefault( env, baseRef );
      if( baseRefVal ){
        response = objectAssignDeep( response, baseRefVal );
      } else {
        console.error( `Unable to locate Base/Ref of ${baseRef}.` );
      }
    }

    // If this is a Base response, we may merge it with our existing Base to create the new base
    // If not, merge it with our existing Base to create the potential response
    var baseSet = Util.objPathsDefault( response, 'Base/Set', false );
    var baseCriteria = Util.objPathsDefault( response, 'Base/Criteria', "true" );
    var baseCriteriaMet = Template.evalBoolean( baseCriteria, env );
    if( baseSet ){
      if( baseCriteriaMet ){
        // This is a base that meets criteria,
        // so merge it with the existing base to create the new one.
        responseBase = objectAssignDeep( responseBase, response );
        delete( responseBase.Base );
      }

      // Base responses are never added, weather they meet criteria or not
      shouldAdd = false;

    } else {
      // Supplement the response with values from our base, if needed.
      response = objectAssignDeep( {}, responseBase, response );

      // Evaluate the criteria. If it evaluates to true, add it to the list
      var criteria = Util.objPathsDefault( response, 'Criteria', "true" );
      shouldAdd = Template.evalBoolean( criteria, env );
    }

    if( shouldAdd ){
      cleanTemplate( response.Template );
      ret.push( response );
    }
  }

  //console.log( 'filterResponses ret', ret );
  return Promise.resolve( ret );
};

var pickResponse = function( responses ){
  var size = responses.length;
  if( size == 0 ){
    console.error( 'Waring: no responses with matching criteria.')
    return Promise.resolve( {} );
  }

  var index = Util.random( size );
  console.log( 'Response pickResponse index', index, responses[index] );
  return Promise.resolve( responses[index] );
};

var buildMessages = function( env, response ){
  var ret = {};
  Object.assign(
    ret,
    executeMessages( env, response, response.TemplateEnvMap, Template.eval )
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
      console.error( 'Response rebuildMessages err', err );
      return Promise.reject( err );
    });
};
exports.rebuildMessages = rebuildMessages;

var executeMessages = function( env, response, map, templateExec ){
  var ret = {};
  var keys = Object.keys( map );
  for( var co=0; co<keys.length; co++ ){
    var templatePath = keys[co];

    var template = Util.objPath( response, templatePath );
    if( template !== undefined ){
      var resultValue = templateExec( template, env );

      var resultPath = map[templatePath];
      Util.setObjPath( ret, resultPath, resultValue );
    }
  }
  return ret;
};