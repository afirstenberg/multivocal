
const Template = require('./template');
const Response = require('./response');
const Util = require('./util');
const Auth = require('./auth');

/**===================================================================*/

exports.Config = {
  Simple:    require('./config-simple'),
  Merge:     require('./config-merge'),
  Firebase:  require('./config-firebase'),
  Firestore: require('./config-firestore')
};

var Config = new exports.Config.Merge( [], {addToMultivocal:false} );
var setConfig = function( conf ){
  Config = conf;
};
exports.setConfig = setConfig;

var addConfig = function( conf ){
  Config.add( conf );
};
exports.addConfig = addConfig;

const DefCon = new exports.Config.Simple( require( '../config/defcon.js' ), {addToMultivocal:false} );

/**===================================================================*/

var timing = function( env, tag ){
  Util.setObjPath( env, `Timing/${tag}`, Date.now() );
  return Promise.resolve( env );
};

var timingBegin = function( env, tag ){
  return timing( env, `${tag}Begin` );
};
var timingStart = timingBegin;

var timingEnd = function( env, tag ){
  return timing( env, `${tag}End`)
};
var timingStop = timingEnd;

/**===================================================================*/

var builders = [];
exports.builders = builders;

var addBuilder = function( func ){
  builders.push( func );
};
exports.addBuilder = addBuilder;

var buildEnvPlatform = function( env ){
  var rules = Util.setting( env, 'Platform/RuleCriteria' );
  var keys = Object.keys( rules );
  for( var co=0; co<keys.length; co++ ){
    var ruleName = keys[co];
    var rule = rules[ruleName];
    var val;
    if( ruleName.startsWith('is') || ruleName.startsWith('Is') ){
      val = Template.evalBoolean( rule, env );
    } else {
      val = Template.eval( rule, env );
    }
    Util.setObjPath( env, `Platform/${ruleName}`, val );
  }

  console.log( 'Multivocal buildEnvPlatform', env.Platform );
  return Promise.resolve( env );
};

var buildEnvLocale = function( env ){
  var locale = Util.pathSetting( env, 'Locale' );
  var dashIndex = locale.indexOf('-');
  var lang = 'und';
  if( dashIndex > 0 ){
    lang = locale.substring( 0, dashIndex );
  }
  env.Locale = locale;
  env.Lang = lang;
  return Promise.resolve( env );
};

var buildEnvParameters = function( env ){
  env.Parameter = Util.pathSetting( env, 'Parameters' );
  return Promise.resolve( env );
};

var buildEnvContexts = function( env ){
  env.Context = {};

  // Load any contexts into a more useful environment attribute
  var contexts = Util.pathSetting( env, 'Contexts' );
  for( var co=0; co<contexts.length; co++ ){
    var context = contexts[co];
    var contextName = context.name;
    var lastSlash = contextName.lastIndexOf( '/' );
    contextName = contextName.substr( lastSlash+1 );
    env.Context[contextName] = context;
  }

  return Promise.resolve( env );
};

var buildEnvStatePath = function( env, path ){
  var valStr = Util.pathSetting( env, path );
  var val = JSON.parse( valStr );
  Util.setObjPath( env, path, val );
};

var buildEnvState = function( env ){

  // FIXME - this should be a PathList setting
  var settingsPathList = [
    'User/State',
    'Session/State',
    'Session/Counter',
    'Session/Consecutive'
  ];
  settingsPathList.map( path => buildEnvStatePath( env, path ) );

  return Promise.resolve( env );
};

var buildEnvOption = function( env ){
  var optionValue = Util.pathSetting( env, 'Option' );
  var optionPrefix = Util.setting( env, 'Option/Prefix' );
  if( optionValue && optionValue.startsWith( optionPrefix ) ){
    optionValue = optionValue.substring( optionPrefix.length );
    optionValue = parseInt( optionValue, 10 );
  }

  Util.setObjPath( env, "Option", optionValue );
  return Promise.resolve( env );
};

var buildEnvPermissions = function( env ){
  var permissionList = Util.setting( env, 'Requirements/PermissionList' );

  permissionList.map( entry => {
    var val = Util.objPath( env, entry.Source );
    if( typeof val !== 'undefined' ){
      Util.setObjPath( env, entry.Target, val );
    }
  });

  return Promise.resolve( env );
};

var buildEnvAuthId = function( env ){
  // Set the anonymous user ID
  var idNativeValue = Util.pathSetting( env, 'User/Id' );
  var idTemplate = Util.setting( env, 'User/Id/Template' );
  if( idNativeValue ){
    Util.setObjPath( env, 'User/IdNative', idNativeValue );
    var idValue = Template.eval( idTemplate, env );
    Util.setObjPath( env, 'User/Id', idValue );
  }

  return Promise.resolve( env );
};

var buildEnvAuthIdentity = function( env ){
  // If we have an identity token, validate it
  var profileToken = Util.pathSetting( env, 'User/Profile' );

  // No identity token. Skip it
  if( !profileToken ){
    return Promise.resolve( env );
  }

  Util.setObjPath( env, 'User/IdentityToken', profileToken );

  var sources = Util.setting( env, 'Requirements/Auth' );
  return Auth.addSources( sources )
    .then( () => Auth.verify( profileToken ) )
    .then( profile => {
      console.log('buildEnvAuthIdentity profile', profile);
      Util.setObjPath( env, 'User/Profile', profile );
      Util.setObjPath( env, 'User/IsAuthenticated', true );
      return Promise.resolve( env );
    })
    .catch( err => {
      // Log the error, but return as normal
      console.error('Unable to verify token', profileToken, err);
      return Promise.resolve( env );
    })
};

var buildEnvAuth = function( env ){
  return buildEnvAuthId( env )
    .then( env => buildEnvAuthIdentity( env ) )
};

var buildEnvFeatureGroup = function( env, destinationPath ){
  var surfaces = Util.pathSetting( env, destinationPath );
  if( !Array.isArray(surfaces) ){
    surfaces = [surfaces];
  }
  surfaces.map( surface => {
    var capabilities = surface.capabilities || [];
    var val = true; // I assume the surface will have a name someday, put it here
    capabilities.map( capability => {
      var name = capability.name;
      var dot = name.lastIndexOf( '.' )+1;
      name = name.substring( dot );
      Util.setObjPath( env, `${destinationPath}/${name}[+]`, val );
    });
  });
};

var buildEnvFeatures = function( env ){
  buildEnvFeatureGroup( env, 'Session/Feature' );
  buildEnvFeatureGroup( env, 'User/Feature' );

  return Promise.resolve( env );
};

var buildEnvMediaStatus = function( env ){

  var inputs = Util.pathSetting( env, 'MediaStatus/Inputs' );
  console.log('buildEnvMediaStatus inputs', inputs);
  for( var ico = 0; ico<inputs.length; ico++ ){
    var input = inputs[ico];
    var arguments = input.arguments;
    for( var aco=0; arguments && aco<arguments.length; aco++ ){
      var argument = arguments[aco];
      if( argument.name === 'MEDIA_STATUS' ){
        var status = argument.extension.status;
        Util.setObjPath( env, 'MediaStatus', status );
      }
    }
  }

  return Promise.resolve( env );
};

var buildEnvIntents = function( env ){

  env.IntentName = Util.pathSetting( env, 'Intent' );
  env.Intent     = Util.setting( env, 'Intent/Template', Template.Methods.Str );

  env.ActionName = Util.pathSetting( env, 'Action' );
  env.Action     = Util.setting( env, 'Action/Template', Template.Methods.Str );

  env.Default    = Util.setting( env, 'Default/Template', Template.Methods.Str );

  return Promise.resolve( env );
};

var buildEnvLocalRecursive = function( env, index ){
  if( index >= builders.length ){
    return Promise.resolve( env );
  }

  var builder = builders[index];
  return builder( env )
    .then( env => {
      return buildEnvLocalRecursive( env, index+1 );
    });
};

var buildEnv = function( env ){
  return loadConfig( env )
    .then( env => buildEnvPlatform( env ) )
    .then( env => buildEnvLocale( env ) )
    .then( env => buildEnvParameters( env ) )
    .then( env => buildEnvContexts( env ) )
    .then( env => buildEnvState( env ) )
    .then( env => buildEnvOption( env ) )
    .then( env => buildEnvPermissions( env ) )
    .then( env => buildEnvAuth( env ) )
    .then( env => buildEnvFeatures( env ) )
    .then( env => buildEnvMediaStatus( env ) )
    .then( env => buildEnvIntents( env ) )
    .then( env => buildEnvLocalRecursive( env, 0 ) )
    .then( env => Promise.resolve( env ) );
};

/**===================================================================*/

var loadConfig = function( env ){
  return Config.get()
    .then( config =>{
      env.Config = config;
      return DefCon.get();
    })
    .then( defcon => {
      env.DefCon = defcon;
      return Promise.resolve( env );
    });
};

/**===================================================================*/

var loadVoice = function( env ){
  var sessionData = env.Session.State;

  var voices = Util.pathSetting( env, 'Voice' );
  var size = voices.length;
  env.Voices = voices;
  if( env.RequestedVoiceName ){
    for( var co=0; co<size; co++ ){
      var voice = voices[co];
      if( voice.Name === env.RequestedVoiceName ){
        env.Voice = voice;
      }
    }

  } else if( sessionData.Voice ){
    env.Voice = sessionData.Voice;

  } else {
    var index = Util.random( size );
    env.Voice = voices[index];
  }
  env.Session.State.Voice = env.Voice;
  return Promise.resolve( env );
};
exports.loadVoice = loadVoice;

/**===================================================================*/

var requesters = {};

var requestDefault = function( env, name ){
  if( name ){
    var request = `Request.${name}`;
    Util.setObjPath( env, 'Requirements/RequestName', name );
    Util.setObjPath( env, 'Requirements/Request', request );
    Util.setObjPath( env, 'Action',  `${request}.${env.Action}`);
    Util.setObjPath( env, 'Intent',  `${request}.${env.Intent}`);
    Util.setObjPath( env, 'Default', `${request}.${env.Default}`);
  }

  return Promise.resolve( env );
};

var requestPermission = function( env ){
  var permissionList = Util.setting( env, 'Requirements/PermissionList' );

  var requirements = Util.objPath( env, 'Requirements/Requested' );
  var permissions;
  if( requirements ){
    var permissionsHash = {};
    permissionList.map( entry => {
      var requirement = entry.Target;
      if( requirements.includes(requirement) ){
        permissionsHash[entry.Permission] = true;
      }
    });
    permissions = Object.keys(permissionsHash).sort();
  }

  if( permissions ){
    requestRequirementsContext( env );

    var intent = {
      "intent": "actions.intent.PERMISSION",
      "data": {
        "@type": "type.googleapis.com/google.actions.v2.PermissionValueSpec",
        "permissions": permissions
      }
    };
    Util.setObjPath( env, 'Requirements/Intent', intent );
  }

  return requestDefault( env, 'Permission');
};
DefCon.get().then( defcon => {
  defcon.Setting.Requirements.PermissionList.map( entry => {
    var target = entry.Target;
    if( target ){
      requesters[target] = requestPermission;
    }
  });
});

var requestSignIn = function( env ){
  requestRequirementsContext( env );

  var intent = {
    "intent": "actions.intent.SIGN_IN",
    "inputValueData": {}
  };
  Util.setObjPath( env, 'Requirements/Intent', intent );

  return requestDefault( env, 'SignIn' );
};
requesters['User/IsAuthenticated'] = requestSignIn; // FIXME

var requestRequirementsContext = function( env, additionalParameters ){
  var parameters = {
    action:     env.Action,
    actionName: env.ActionName,
    intent:     env.Intent,
    intentName: env.IntentName
  };
  if( additionalParameters ){
    Object.assign( parameters, additionalParameters );
  }
  var context = {
    name: 'multivocal_requirements',
    lifespan: 1,
    parameters: parameters
  };
  Util.setObjPath( env, 'Requirements/Context', context );
};

var requestRequirements = function( env ){
  var requirements = Util.pathSetting( env, 'Requirements' );
  if( typeof requirements === 'undefined' ){
    requirements = [];
  }
  if( !Array.isArray(requirements) ){
    requirements = [requirements];
  }
  Util.setObjPath( env, 'Requirements/Requested', requirements );

  // Check our requirements to see if we have everything we need
  var requester;
  for( var co=0; co<requirements.length && !requester; co++ ){
    var requirement = requirements[co];
    var val = Util.objPath( env, requirement );
    if( typeof val === 'undefined' ){
      requester = requesters[requirement];
      if( !requester ){
        console.error('Multivocal requestRequirements no requester for requirement',requirement);
      }
    }
  }

  // If we're missing something, request it
  requester = requester || requestDefault;
  return requester( env )
    .catch( err => {
      console.error( 'Multivocal requestRequirements err', err );
    });
};

/**===================================================================*/

var handlers = {};
exports.handlers = handlers;

var addHandler = function( intentActionName, func ){
  handlers[intentActionName] = func;
};
exports.addHandler = addHandler;

var addIntentHandler = function( intentName, func ){
  handlers[`Intent.${intentName}`] = func;
};
exports.addIntentHandler = addIntentHandler;

var addActionHandler = function( actionName, func ){
  handlers[`Action.${actionName}`] = func;
};
exports.addActionHandler = addActionHandler;

var processCounters = function( env ){
  // Handle the special case of the total number of visits for this session
  // by incrementing the value under State and recording that we should
  // handle the "NumVisits" counter in the usual way.
  Util.incObjPath( env, 'Session/State/NumVisits' );
  Util.setObjPath( env, 'Counter[+]', 'NumVisits' );

  // Store the counters for the action, intent, and outent
  // based on what they're set to.
  Util.setObjPathFrom( env, 'Counter[+]', 'Action' );
  Util.setObjPathFrom( env, 'Counter[+]', 'Intent' );
  Util.setObjPathFrom( env, 'Counter[+]', 'Outent' );

  // Get the counters that have been set and de-dupe them
  var counterArray = Util.objPathsDefault( env, 'Counter', [] );
  counterArray = [... new Set( counterArray )];

  // Go through the Consecutive list and remove those not present in the counterArray
  var consecutive = Util.objPathsDefault( env, 'Session/Consecutive', {} );
  var keys = Object.keys( consecutive );
  for( var co=0; co<keys.length; co++ ){
    var key = keys[co];
    if( counterArray.indexOf( key ) == -1 ){
      delete( consecutive[key] );
    }
  }
  Util.setObjPath( env, 'Session/Consecutive', consecutive );

  // Go through the counterArray and increment the session counter
  // and consecutive counter
  for( co=0; co<counterArray.length; co++ ){
    var counter = counterArray[co];
    Util.incObjPath( env, `Session/Counter/${counter}` );
    Util.incObjPath( env, `Session/Consecutive/${counter}` );
  }

  return Promise.resolve( env );
};

var handleDefault = function( env ){
  return processCounters( env )
    .then( env => Response.getFromSettings( env, 'Response' ) );
};
handlers['Default'] = handleDefault;
exports.handleDefault = handleDefault;


var handle = function( env ){
  if( env.Sent ){
    return Promise.resolve( env );
  }

  // Get the possible handler names we might use
  // and locate a handler that has been registered for that name.
  var handler;
  var handlerName;
  var handlerNames = Util.setting( env, 'Handler/Names', Template.Methods.Array );
  for( var co=0; co<handlerNames.length && !handler; co++ ){
    handlerName = handlerNames[co];
    handler = handlers[handlerName];
  }

  // Store the handler name and determine what counter to use to record this
  Util.setObjPath( env, 'HandlerName', handlerName );
  var handlerCounter = Util.setting( env, 'Handler/Counter', Template.Methods.Str );
  Util.setObjPath( env, 'Counter[+]', handlerCounter );

  // Call the handler
  console.log( 'Multivocal handle', handlerName );
  return handler( env )
    .catch( err => {
      console.error( 'Multivocal Problem with handler', err );
      return Promise.reject( err );
    });
};

/**===================================================================*/

var addSuffix = function( env ){
  if( env.Sent ){
    return Promise.resolve( env );
  }

  var noSuffixNeeded = Util.setting( env, 'NoSuffixNeeded/Criteria', Template.Methods.Bool );
  if( noSuffixNeeded ){
    return Promise.resolve( env );
  }

  return Response.getFromSettings( env, 'Suffix' );
};

/**===================================================================*/

var formatMessageContent = function( env, envName, template ){
  // If a value has already been set, skip it.
  var sendPath = `Send/${envName}`;
  if( Util.objPath( env, sendPath ) ){
    return Promise.resolve( env );
  }

  var val = Util.setting( env, `${envName}/Template`, Template.Methods.Str );
  if( val ){
    Util.setObjPath( env, sendPath, val );
  }

  return Promise.resolve( env );
};

var formatMessage = function( env ){
  return formatMessageContent( env, 'Ssml' )
    .then( env => formatMessageContent( env, 'Text' ) )

    .then( env => {
      var shouldRepeat = Util.objPathsDefault( env, 'Response/ShouldRepeat', false );
      if( shouldRepeat ){
        // If we're repeating, copy the last repeat context
        Util.setObjPathFrom( env, 'Send/Remember', 'Context/multivocal_repeat' );
        Util.setObjPath( env, 'Send/Remember/lifespan', 1 );
      } else {
        // This is a normal message, so save the info in case we repeat next time
        Util.setObjPath(     env, 'Send/Remember/name', 'multivocal_repeat' );
        Util.setObjPath(     env, 'Send/Remember/lifespan', 1 );
        Util.setObjPathFrom( env, 'Send/Remember/parameters/Ssml', 'Send/Ssml' );
        Util.setObjPathFrom( env, 'Send/Remember/parameters/Text', 'Send/Text' );
      }
      return Promise.resolve( env );
    });
};

/**===================================================================*/

var formatSession = function( env ){
  var state = Util.objPathsDefault( env, 'Session/State', {} );
  var counter = Util.objPathsDefault( env, 'Session/Counter', {} );
  var consecutive = Util.objPathsDefault( env, 'Session/Consecutive', {} );
  var context = {
    name: 'multivocal_session',
    lifespan: 99,
    parameters: {
      state: JSON.stringify( state ),
      counter: JSON.stringify( counter ),
      consecutive: JSON.stringify( consecutive )
    }
  };
  Util.setObjPath( env, 'Send/Session', context );
  return Promise.resolve( env );
};

var formatContext = function( env, context ){
  if( typeof context === 'string' ){
    context = {
      name: context,
      lifespan: 5
    }
  }
  if( !context.parameters ){
    context.parameters = {};
  }

  var pathName = `Send/Context/${context.name}`;
  Util.setObjPath( env, pathName, context );

  return Promise.resolve( context );
};

var formatContextList = function( env, contextPath ){
  var contextList = Util.objPath( env, contextPath );
  if( !contextList ){
    return Promise.resolve( null );
  }

  // If there is just one Context, not a list, process it
  if( !Array.isArray( contextList ) ){
    return formatContext( env, contextList );
  }

  // We have a list of Contexts, process all of them
  var promises = contextList.map( context => formatContext( env, context ) );
  return Promise.all( promises )
    .catch( err => {
      console.error( 'Multivocal formatContextList err', err );
      return Promise.reject( err );
    });
};

var formatContexts = function( env ){
  // This isn't a Path since we need to get the results from each one
  var contextPathList = Util.setting( env, 'Context/PathList' );
  var promises = contextPathList.map( contextPath => formatContextList( env, contextPath ) );
  return Promise.all( promises )
    .then( result => {
      var contexts = Util.objPathsDefault( env, 'Send/Context', {} );
      // var contextList = Object.values(contexts);  // Requires Node 7+. So use next line instead.
      var contextList = Object.keys(contexts).map(k=>contexts[k]);
      Util.setObjPath( env, 'Send/ContextList', contextList );

      return Promise.resolve( env );
    })
    .catch( err => {
      console.error( 'Multivocal formatContexts err', err );
      return Promise.reject( err );
    });
};

var formatTable = function( env ){
  var data = Util.objPath( env, 'Msg/Table/Data' );
  console.log('Multivocal formatTable', env.Msg);
  if( data ){
    Util.setObjPathFrom( env, 'Send/Table/title', 'Msg/Table/Title' );
    Util.setObjPathFrom( env, 'Send/Table/image/url', 'Msg/Table/ImageUrl' );
    Util.setObjPathFrom( env, 'Send/Table/image/accessibilityText', 'Msg/Table/ImageText' );

    var headers = Util.objPathsDefault( env, 'Msg/Table/Headers', [] );
    for( var co=0; co<headers.length; co++ ){
      Util.setObjPath( env, 'Send/Table/columnProperties[+]/header', headers[co] );
      Util.setObjPath( env, 'Send/Table/columnProperties[=]/horizontalAlignment', 'LEADING' );
    }

    for( var cr=0; cr<data.length; cr++ ){
      var row = data[cr];
      Util.setObjPath( env, 'Send/Table/rows[+]', {} );
      for( var cc=0; cc<row.length; cc++ ){
        var cell = row[cc];
        Util.setObjPath( env, 'Send/Table/rows[=]/cells[+]/text', cell );
      }
      Util.setObjPath( env, 'Send/Table/rows[=]/dividerAfter', false );
    }
  }
  return Promise.resolve( env );
};

var formatShouldClose = function( env ){
  var shouldClose = Util.pathSetting( env, 'ShouldClose' );
  Util.setObjPath( env, 'Send/ShouldClose',         shouldClose );
  return Promise.resolve( env );
};

var JsonFormatter = require('./formatter');

var formatJson = function( env ){
  if( env.Sent ){
    return Promise.resolve( env );
  }

  if( !env.Send.Json ){
    var json = JsonFormatter.format( env );
    env.Send.Json = json;
  }

  return Promise.resolve( env );
};

var format = function( env ){
  if( env.Sent ){
    return Promise.resolve( env );
  }

  env.Send = {
    ViaApp: false
  };

  return formatMessage( env )
    .then( env => formatSession( env ) )
    .then( env => formatContexts( env ) )
    .then( env => formatTable( env ) )
    .then( env => formatShouldClose( env ) )
    .then( env => formatJson( env ) )
    .catch( err => {
      console.error( 'Multivocal format err', err );
      return Promise.reject( err );
    });
};

/**===================================================================*/

require('./standard').init();

var process = function( env ){

  return timingBegin( env, 'Process' )

    // Build the initial environment
    .then( env => buildEnv( env ) )

    // Set the "voice" field for the environment
    .then( env => loadVoice( env ) )

    // See if there are any prerequisites/requirements
    .then( env => requestRequirements( env ) )

    // Determine what handler we should call and call it
    .then( env => handle( env ) )

    // If there needs to be anything else on the reply (like asking
    // a question) figure that out here.
    .then( env => addSuffix( env ) )

    // Prepare a response if one hasn't already been sent
    .then( env => format( env ) )

    .then( env => timingEnd( env, 'Process' ) )

    .catch( err => {
      console.error( 'Problem during processing', err );
      return Promise.reject( err );
    });
};
exports.process = process;

var processExpressParameters = function( request, response ){
  var env = {
    Body: request.body,
    Req: request,
    Res: response
  };
  return Promise.resolve( env );
};

var processExpressResponse = function( env ){
  if( !env.Sent && env.Send.Json ){
    env.Res.send( env.Send.Json );
    env.Sent = true;
  }
  return Promise.resolve( env );
};

var processExpressWebhook = function( request, response ){
  return processExpressParameters( request, response )
    .then( env => process( env ) )
    .then( env => processExpressResponse( env ) );
};
exports.processExpressWebhook = processExpressWebhook;
exports.processGCFWebhook     = processExpressWebhook;

const FirebaseFunctions = require('firebase-functions');
var processFirebaseWebhook =
  FirebaseFunctions.https.onRequest( (request, response) => processExpressWebhook( request, response ) );
exports.processFirebaseWebhook = processFirebaseWebhook;

var processLambdaParameters = function( event, context, callback ){
  var env = {
    Body: JSON.parse( event.body ),
    Lambda: {
      Event:    event,
      Context:  context,
      Callback: callback
    }
  };
  return Promise.resolve( env );
};

var processLambdaResponse = function( env ){
  if( !env.Sent && env.Send.Json ){
    var response = {
      statusCode: 200,
      headers: {},
      body: JSON.stringify( env.Send.Json )
    };
    env.Lambda.Callback( null, response );
    env.Sent = true;
  }
  return Promise.resolve( env );
};

var processLambdaWebhook = function( event, context, callback ){
  return processLambdaParameters( event, context, callback )
    .then( env => process( env ) )
    .then( env => processLambdaResponse( env ) );
};
exports.processLambdaWebhook = processLambdaWebhook;
