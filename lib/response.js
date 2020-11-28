
const Template = require( './template' );
const Util = require( './util' );

const objectAssignDeep = require(`object-assign-deep`);

const smdjs = require('speechmarkdown-js');

var targetBase = function( settingPath ){
  return {
  }
}

var targetTemplateResponseMap = function( settingPath ){
  return {
    "Template": settingPath,
    "Debug": "Debug/"+settingPath
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
  var transformers =
    Util.setting( env, settingPath+'/Transformers') ||
    Util.setting( env, 'Transform/List');
  return get( env, responseNames, responseField, responseBase, templateResponseMap, rawParameterName, transformers );
};
exports.getFromSettings = getFromSettings;

const templateResponseMapDefault = {
  "Template": "Msg"
}

const templateEnvMapDefault = {
  TemplateEnvMap: templateResponseMapDefault
};

var get = function( env, responseNames, responseField, responseDefault, templateResponseMap, rawParameterName, transformers ){
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
      return rebuildMessages( env, env[responseField], templateResponseMap, transformers );
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
    // If the only parameter of the object is Debug, then it should be
    // treated as if we were setting a Base object
    if( response.Debug && Object.keys(response).length === 1 ){
      response = {
        Base: {Set:true},
        Debug: response.Debug
      }
    }

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
      if( response.Debug && typeof response.Debug === 'object' ){
        response.Debug.Index = co;
      }
      response.Index = co;
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

const transformer = {}
var addTransformer = function( name, func ){
  transformer[name] = func;
}
exports.addTransformer = addTransformer;

var TemplateTransformer = function( template, env ){
  return Template.eval( template, env );
}
transformer.TemplateTransformer = TemplateTransformer;

var thisTransformer = function( val, env ){
  if( val && (typeof val === 'object') && Object.keys(val).length === 1 && val['_This'] ){
    val = val['_This'];
  }
  return val;
}
transformer.ThisTransformer = thisTransformer;

var rewrite = function( text, rules ){
  if( text && rules ){
    rules.forEach( rule => {
      var from = rule.Regex ? new RegExp(rule.Regex, "g") : rule.from;
      var to = rule.To;
      if( from ){
        text = text.replace( from, to );
      }
    });
  }
  return text;
}

var simpleTextToSsmlTransformer = function( val, env ){
  if( val && (typeof val === 'object') && val.Text && !val.Ssml ){
    var rules = Util.setting( env, 'Transform/TextToSsml/Rewrite' );
    val.Ssml = rewrite( val.Text, rules );
  }
  return val;
}
transformer.SimpleTextToSsmlTransformer = simpleTextToSsmlTransformer;

var simpleSsmlToTextTransformer = function( val, env ){
  if( val && (typeof val === 'object') && val.Ssml && !val.Text ){
    var rules = Util.setting( env, 'Transform/SsmlToText/Rewrite' );
    val.Text = rewrite( val.Ssml, rules );
  }
  return val;
}
transformer.SimpleSsmlToTextTransformer = simpleSsmlToTextTransformer;

var envToSpeechMarkdownPlatform = function( env ){
  let ret = null;

  if( env.Platform.IsActionsOnGoogle ){
    ret = 'google-assistant';
  }

  return ret;
}

var speechMarkdownTransformer = function( val, env ){
  if( val && (typeof val === 'object') && val.Markdown ){
    const markdown = val.Markdown;
    console.log('smd markdown',markdown);
    const options = {
      platform: envToSpeechMarkdownPlatform( env ),
      includeSpeakTag: false
    };
    console.log('smd options',options);
    const smd = new smdjs.SpeechMarkdown( options );
    if( !val.Text ){
      val.Text = smd.toText( markdown );
      console.log('smd text',val.Text);
    }
    if( !val.Ssml ){
      var ssmlmd = markdown;
      var sanitize = Util.setting( env, 'Transform/SpeechMarkdown/SanitizeSsml' );
      if( sanitize ){
        var rules = Util.setting( env, 'Transform/TextToSsml/Rewrite' );
        ssmlmd = rewrite( markdown, rules );
      }
      val.Ssml = smd.toSSML( ssmlmd );
      console.log('smd ssml',val.Ssml);
    }
  }
  return val;
}
transformer.SpeechMarkdownTransformer = speechMarkdownTransformer;

var rebuildMessages = function( env, response, templateResultMap, transformers ){
  return buildMessages( env, response, templateResultMap, transformers )
    .catch( err => {
      console.error( 'Response rebuildMessages err', err );
      return Promise.reject( err );
    });
};
exports.rebuildMessages = rebuildMessages;

var buildMessages = function( env, response, templateResultMap, transformers ){
  response = response || env.Response;
  templateResultMap = templateResultMap || templateEnvMapDefault;

  var keys = Object.keys( templateResultMap );
  keys.forEach( templatePath => {
    var result = executeMessage( env, response, templatePath, transformers );
    if( result ){
      var resultPath = templateResultMap[templatePath];
      Util.setObjPath( env, resultPath, result );
    }
  })
  return Promise.resolve( env );
};

var executeMessage = function( env, response, templatePath, transformers ){
  var ret;
  var template = Util.objPath( response, templatePath );
  if( template !== undefined ){

    ret = template;
    transformers.forEach( transformerName => {
      var func = transformer[transformerName];
      if( func ){
        ret = func( ret, env );
      } else {
        console.error( 'Unknown transformer', transformerName );
      }
    })

  }
  return ret;
};