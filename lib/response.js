
const Template = require( './template' );
const Util = require( './util' );

const objectAssignDeep = require(`object-assign-deep`);

var targetBase = function( settingPath ){
  return {
  }
}

var targetTemplateResponseMap = function( settingPath ){
  return {
    "Template": settingPath
  }
}

var getFromSettings = function( env, settingPath ){
  var responseNames =
    Util.setting( env, settingPath+'/Path', Template.Methods.Array ) ||
    Util.setting( env, 'FlexResponse/Path', Template.Methods.Array );
  var responseField = Util.setting( env, settingPath+'/EnvField' ) || `${settingPath}Response`;
  var responseBase  = Util.setting( env, settingPath+'/Base' ) || targetBase( settingPath );
  var templateResponseMap = Util.setting( env, settingPath+'/TemplateResponseMap' ) ||
    targetTemplateResponseMap( settingPath );
  var rawParameterName = Util.setting( env, settingPath+'/RawParameterName' );
  return get( env, responseNames, responseField, responseBase, templateResponseMap, rawParameterName );
};
exports.getFromSettings = getFromSettings;

const templateResponseMapDefault = {
  "Template": "Msg"
}

const templateEnvMapDefault = {
  TemplateEnvMap: templateResponseMapDefault
};

var get = function( env, responseNames, responseField, responseDefault, templateResponseMap, rawParameterName ){
  responseField = responseField || 'Response';
  responseDefault = responseDefault || templateEnvMapDefault;
  templateResponseMap = templateResponseMap || templateResponseMapDefault;

  // Get all of the responses for this intent or action (or default)
  return getResponses( env, responseNames )

    // Filter them to those that match
    .then( allResponses => {
      return filterResponses( env, allResponses, responseDefault, rawParameterName );
    })

    // Pick one of the remaining responses
    .then( responses => {
      return pickResponse( responses );
    })

    // Save this to the environment and build messages from our templates
    // that get saved to the environment.
    .then( response => {
      env[responseField] = Object.assign( {}, response );
      return rebuildMessages( env, env[responseField], templateResponseMap );
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
  //console.log( 'Response getResponses name', path, '=', ret );
  console.log('Response getResponses name',path);
  return Promise.resolve( ret );
};

var filterResponses = function( env, allResponses, responseBaseDefault, rawParameterName ){
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
      rawParameterName = rawParameterName || '_This';
      // TODO: Build this from... something.
      response = {
        Template: {
          [rawParameterName]: response
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
      ret.push( response );
    }
  }

  //console.log( 'filterResponses ret', ret );
  return Promise.resolve( ret );
};

var pickResponse = function( responses ){
  var size = responses.length;
  if( size == 0 ){
    console.error( 'Waring: no responses with matching criteria.');
    return Promise.resolve( {} );
  }

  var index = Util.random( size );
  //console.log( 'Response pickResponse index', index, responses[index] );
  return Promise.resolve( responses[index] );
};

var evalTransformer = function( template, env ){
  return Template.eval( template, env );
}

var thisTransformer = function( val, env ){
  if( val && (typeof val === 'object') && Object.keys(val).length === 1 && val['_This'] ){
    val = val['_This'];
  }
  return val;
}

var simpleTextToSsmlTransformer = function( val, env ){
  if( val && (typeof val === 'object') && val.Text && !val.Ssml ){
    val.Ssml = val.Text;
    val.Ssml = val.Ssml.replace( /&/g, '&amp;' );
    val.Ssml = val.Ssml.replace( /</g, '&lt;' );
    val.Ssml = val.Ssml.replace( />/g, '&gt;' );
  }
  return val;
}

var simpleSsmlToTextTransformer = function( val, env ){
  if( val && (typeof val === 'object') && val.Ssml && !val.Text ){
    val.Text = val.Ssml;
    val.Text = val.Text.replace( /<.*?>/g, '' );
    val.Text = val.Text.replace( /&gt;/g, '>' );
    val.Text = val.Text.replace( /&lt;/g, '<' );
    val.Text = val.Text.replace( /&amp;/g, '&' );
  }
  return val;
}

var buildMessages = function( env, response, templateResultMap ){
  var transformers = [
    evalTransformer,
    thisTransformer,
    simpleTextToSsmlTransformer,
    simpleSsmlToTextTransformer
  ];
  var ret = {};
  Object.assign(
    ret,
    executeMessages( env, response, templateResultMap, transformers )
  );
  return Promise.resolve( ret );
};

var rebuildMessages = function( env, response, templateResultMap ){
  response = response || env.Response;
  return buildMessages( env, response, templateResultMap )

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

var executeMessages = function( env, response, templateResultMap, transformers ){
  var ret = {};
  templateResultMap = templateResultMap ? templateResultMap : templateEnvMapDefault;
  var keys = Object.keys( templateResultMap );
  for( var co=0; co<keys.length; co++ ){
    var templatePath = keys[co];

    var template = Util.objPath( response, templatePath );
    if( template !== undefined ){

      var resultValue = template;
      transformers.forEach( transformer => {
        resultValue = transformer( resultValue, env );
      })

      var resultPath = templateResultMap[templatePath];
      Util.setObjPath( ret, resultPath, resultValue );
    }
  }
  return ret;
};