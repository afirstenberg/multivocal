
const Template = require('./template');
const Response = require('./response');
const Util = require('./util');
const Auth = require('./auth');
const Log = require('./log');

/**===================================================================*/

exports.Config = {
  Simple:    require('./config-simple'),
  Merge:     require('./config-merge'),
  Firebase:  require('./config-firebase'),
  Firestore: require('./config-firestore')
};

console.log('Creating Config');
var Config = new exports.Config.Merge( [], {addToMultivocal:false} );
var setConfig = function( conf ){
  Config = conf;
};
exports.setConfig = setConfig;

var addConfig = function( conf ){
  Config.add( conf );
};
exports.addConfig = addConfig;

var getConfig = function(){
  return Config.get();
};
exports.getConfig = getConfig;

const DefCon = new exports.Config.Simple( require( '../config/defcon.js' ), {addToMultivocal:false} );

/**===================================================================*/

var timing = function( env, tag, label ){
  Util.setObjPath( env, `Timing/${tag}/${label}`, Date.now() );
  return Promise.resolve( env );
};

var timingBegin = function( env, tag ){
  return timing( env, tag, 'Begin' );
};
var timingStart = timingBegin;
exports.timingBegin = timingBegin;
exports.timingStart = timingBegin;

var timingEnd = function( env, tag ){
  return timing( env, tag, 'End' );
};
var timingStop = timingEnd;
exports.timingEnd  = timingEnd;
exports.timingStop = timingEnd;

var timingBlocks = function( env ){
  let timing = Util.objPathsDefault( env, 'Timing', [] );
  let keys = Object.keys( timing );
  let blocks = keys.map( key => {
    let val = timing[key];
    let diff = (val.End ? val.End : Date.now()) - val.Begin;
    return Object.assign({
      Label: key,
      Diff: diff
    }, val);
  });
  Util.setObjPath( env, 'TimingBlocks', blocks );
  return Promise.resolve( env );
};

/**===================================================================*/

var preprocessors = [];

var addPreprocessor = function( func ){
  preprocessors.push( function( env ){
    if( env.Preprocess.Fail ) return Promise.resolve( env );
    return func( env );
  })
};
exports.addPreprocessor = addPreprocessor;

var preprocessGooglePing = function( env ){
  var isPing = false;

  var inputs = Util.pathSetting( env, 'Precondition/GooglePing');
  var argumentName = Util.setting( env, 'Precondition/GooglePing/ArgumentName' );
  for( var co=0; co<inputs.length && !isPing; co++ ){
    var input = inputs[co];
    var arguments = input.arguments || [];
    for( var c1=0; c1<arguments.length && !isPing; c1++ ){
      var argument = arguments[c1];
      var name = argument.name;
      var boolValue = argument.boolValue;
      if( name === argumentName ){
        isPing = boolValue;
      }
    }
  }

  if( isPing ){
    env.Preprocess = {
      Fail: true,
      Msg: {
        Text: "pong"
      }
    };
  }
  return Promise.resolve( env );
};
addPreprocessor( preprocessGooglePing );

var preprocessFormat = function( env ){
  if( !env.Preprocess.Fail ){
    return Promise.resolve( env );
  }

  env.Msg = env.Preprocess.Msg || {Text:"preprocess fail"};

  return formatMessage( env )
    .then( env => formatJson( env ) );
};

var preprocess = function( env ){
  env.Preprocess = {
  };
  return timingBegin( env, 'Multivocal' )
    .then( env => timingBegin( env, 'Preprocess' ) )
    .then( env => loadConfig( env ) )
    .then( env => buildEnvPlatform( env ) )
    .then( env => envFunctionsRecursive( env, preprocessors ) )
    .then( env => preprocessFormat( env ) )
    .then( env => timingEnd( env, 'Preprocess' ) );
};
exports.preprocess = preprocess;

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

  //console.log( 'Multivocal buildEnvPlatform', env.Platform );
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
  env.ParameterInfo = Util.pathSetting( env, 'Parameters/All' );

  env.Parameter = {};
  Object.keys( env.ParameterInfo ).forEach( param => {
    var val = env.ParameterInfo[param];
    if( typeof val === 'object' ){
      var valuePaths = Util.setting( env, 'Parameters/Value/PathList' );  // We need the list, not the value
      val = Util.objPathsDefault( val, valuePaths );
    }
    if( val ){
      env.Parameter[param] = val;
    }
  });

  return Promise.resolve( env );
};

var buildEnvContexts = function( env ){
  env.Context = {};

  // Load any contexts into a more useful environment attribute
  var contexts = Util.pathSetting( env, 'Contexts' );

  if( Array.isArray(contexts) ){
    // Dialogflow format
    for( var co=0; co<contexts.length; co++ ){
      var context = contexts[co];
      var contextName = context.name;
      var lastSlash = contextName.lastIndexOf( '/' );
      contextName = contextName.substr( lastSlash+1 );
      env.Context[contextName] = context;
    }

  } else if( typeof contexts === 'object' ) {
    // AoG 3 / AB format
    var keys = Object.keys( contexts );
    keys.forEach( key => {
      var context = {
        name: key,
        parameters: contexts[key]
      };
      env.Context[key] = context;
    });
  }

  return Promise.resolve( env );
};

var buildEnvStatePath = function( env, path ){
  var val = Util.pathSetting( env, path );
  if( typeof val === 'string' ){
    val = JSON.parse( val );
  }
  Util.setObjPath( env, path, val );
};

var buildEnvState = function( env ){

  // FIXME - this should be a PathList setting
  var settingsPathList = [
    'User/State',
    'Session/State',
    'Session/Counter',
    'Session/Consecutive',
    'Session/Stack'
  ];
  settingsPathList.map( path => buildEnvStatePath( env, path ) );

  // Get the session start time, or set it to now
  var sessionStart = Util.pathSetting( env, 'Session/StartTime' );
  if( !sessionStart ){
    sessionStart = Date.now();
  }
  Util.setObjPath( env, 'Session/StartTime', sessionStart );

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
  var permissionList = Util.setting( env, 'Requirements/Permission/List' );

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
  if( !idNativeValue ){
    const uuid = require('uuid/v4');
    idNativeValue = uuid();
  }
  var statePath = Util.setting( env, 'User/Id/State' );
  Util.setObjPath( env, statePath, idNativeValue );

  var idTemplate = Util.setting( env, 'User/Id/Template' );
  var idValue = Template.eval( idTemplate, env );
  Util.setObjPath( env, 'User/Id', idValue );

  return Promise.resolve( env );
};

var buildEnvAuthAccessToken = function( env ){
  var accessToken = Util.pathSetting( env, 'User/AccessToken' );

  // No access token. Skip it
  if( !accessToken ){
    return Promise.resolve( env );
  }

  Util.setObjPath( env, 'User/AccessToken', accessToken );
  Util.setObjPath( env, 'User/IsAuthenticated', true );

  return Promise.resolve( env );
};

var buildEnvAuthProfileIdentity = function( env ){
  var profileToken = Util.getObjPath( env, 'User/IdentityToken' );

  // If we have an identity token, validate it
  var sources = Util.setting( env, 'Requirements/Auth' );
  return Auth.addSources( sources )
    .then( () => Auth.verify( profileToken ) )

    // If it has validated, then save the profile
    .then( profile => {
      //console.log('buildEnvAuthIdentity profile', profile);
      Util.setObjPath( env, 'User/Profile', profile );
      Util.setObjPath( env, 'User/IsAuthenticated', true );
      return Promise.resolve( env );
    })

    // Log the error, but return as normal
    .catch( err => {
      console.error('Unable to verify token', profileToken, err);
      return Promise.resolve( env );
    })
};

var buildEnvAuthProfileNormalize = function( env ){
  if( Util.objPath( env, 'Platform/DialogflowIntegration' ) === 'hangouts' ){
    Util.setObjPath( env, 'User/IsAuthenticated', true );

    // TODO - All of this should really be derived from settings or something
    var sub = Util.objPathsDefault( env, 'User/ProfileOrig/name', '' );
    sub = sub.substring( 'users/'.length );
    Util.setObjPath( env, 'User/Profile', {sub} );
    Util.setObjPathFrom( env, 'User/Profile/name',    'User/ProfileOrig/displayName' );
    Util.setObjPathFrom( env, 'User/Profile/email',   'User/ProfileOrig/email' );
    Util.setObjPathFrom( env, 'User/Profile/picture', 'User/ProfileOrig/avatarUrl' );

  } else {
    // Can't normalize it
    Util.setObjPathFrom( env, 'User/Profile', 'User/Profile/Orig' );
  }

  console.log('buildEnvAuthProfileNormalize',env.User.Profile);

  return Promise.resolve( env );
};

var buildEnvAuthProfile = function( env ){
  var profileToken = Util.pathSetting( env, 'User/Profile' );
  console.log('buildEnvAuthProfile profileToken',profileToken);

  // No identity token. Skip it
  if( !profileToken ){
    return Promise.resolve( env );

  } else if( typeof profileToken === 'string' ){
    Util.setObjPath( env, 'User/IdentityToken', profileToken );
    return buildEnvAuthProfileIdentity( env );

  } else {
    Util.setObjPath( env, 'User/ProfileOrig', profileToken );
    return buildEnvAuthProfileNormalize( env );
  }

};

var buildEnvAuth = function( env ){
  return buildEnvAuthId( env )
    .then( env => buildEnvAuthAccessToken( env ) )
    .then( env => buildEnvAuthProfile( env ) )
};

var buildEnvFeatureGroup = function( env, destinationPath, arrayMod ){
  var surfaces = Util.pathSetting( env, destinationPath );
  if( !Array.isArray(surfaces) ){
    surfaces = [surfaces];
  }
  surfaces.map( surface => {
    var capabilities = surface.capabilities || [surface];
    var val = true; // I assume the surface will have a name someday, put it here
    capabilities.map( capability => {
      var name = capability.name || capability;
      var dot = name.lastIndexOf( '.' )+1;
      name = name.substring( dot );
      Util.setObjPath( env, `${destinationPath}/${name}${arrayMod}`, val );
    });
  });
};

var buildEnvFeatures = function( env ){
  buildEnvFeatureGroup( env, 'Session/Feature', '' );
  buildEnvFeatureGroup( env, 'User/Feature', '[+]' );

  return Promise.resolve( env );
};

var buildEnvMedia = function( env ){

  let mediaStatus = Util.setting( env, 'Media/Status' );

  if( !mediaStatus ){
    // It wasn't at a normal path, try checking arrays where we have to get the name
    var inputs = Util.pathSetting( env, 'Media/Status/Inputs' );
    //console.log('buildEnvMedia inputs', inputs);
    for( var ico = 0; inputs && ico<inputs.length; ico++ ){
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
  }

  if( mediaStatus ){
    Util.setObjPath( env, 'MediaStatus', status );
  }

  const mediaProgress = Util.setting( env, 'Media/Progress' );
  Util.setObjPath( env, 'MediaProgress', mediaProgress );

  return Promise.resolve( env );
};

var buildEnvIntents = function( env ){

  env.IntentName = Util.pathSetting( env, 'Intent' );
  env.Intent     = Util.setting( env, 'Intent/Template', Template.Methods.Str );

  env.ActionName = Util.pathSetting( env, 'Action' );
  env.Action     = Util.setting( env, 'Action/Template', Template.Methods.Str );

  env.NodeName   = Util.pathSetting( env, 'Node' );
  env.Node       = Util.setting( env, 'Node/Template', Template.Methods.Str );

  env.Default    = Util.setting( env, 'Default/Template', Template.Methods.Str );

  return Promise.resolve( env );
};

var envFunctionsRecursive = function( env, functions, index=0 ){
  if( index >= functions.length ){
    return Promise.resolve( env );
  }

  var func = functions[index];
  return func( env )
    .then( env => {
      return envFunctionsRecursive( env, functions, index+1 );
    });
};

var buildEnv = function( env ){
  return  timingBegin( env, 'BuildEnv' )
    .then( env => buildEnvLocale( env ) )
    .then( env => buildEnvParameters( env ) )
    .then( env => buildEnvContexts( env ) )
    .then( env => buildEnvState( env ) )
    .then( env => buildEnvOption( env ) )
    .then( env => buildEnvPermissions( env ) )
    .then( env => buildEnvAuth( env ) )
    .then( env => buildEnvFeatures( env ) )
    .then( env => buildEnvMedia( env ) )
    .then( env => buildEnvIntents( env ) )
    .then( env => envFunctionsRecursive( env, builders ) )
    .then( env => timingEnd( env, 'BuildEnv' ) );
};

/**===================================================================*/

var loadConfig = function( env ){
  return timingBegin( env, 'Config' )
    .then( () => Config.get() )
    .then( config =>{
      env.Config = config;
      return DefCon.get();
    })
    .then( defcon => {
      env.DefCon = defcon;
      return timingEnd( env, 'Config' );
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

var setRequirementRequest = function( requirement, requester ){
  requesters[requirement] = requester;
};
exports.setRequirementRequest = setRequirementRequest;

var getReqirementRequest = function( requirement ){
  return requesters[requirement];
};
exports.getRequirementRequest = getReqirementRequest;

var requestRequirementsContext = function( env, additionalParameters ){
  var parameters = {
    action:     env.Action,
    actionName: env.ActionName,
    intent:     env.Intent,
    intentName: env.IntentName
  };
  if( typeof additionalParameters === 'object' ){
    Object.assign( parameters, additionalParameters );
  }
  var context = {
    name: 'multivocal_requirements',
    lifespan: 1,
    parameters: parameters
  };
  Util.setObjPath( env, 'Requirements/Context', context );
};

/**
 *
 * @param env
 * @param name
 * @param additionalParameters truthy if the multivocal_requirements context should be set
 *        (if an object, it will be added to the parameters)
 * @return {Promise<any>}
 */
var requestDefault = function( env, name, additionalParameters ){

  if( name ){
    // Save environment information if we expect to use it
    if( additionalParameters ){
      requestRequirementsContext( env, additionalParameters );
    }

    // Change the environment to reflect the request
    var request = `Request.${name}`;
    Util.setObjPath( env, 'Requirements/RequestName', name );
    Util.setObjPath( env, 'Requirements/Request', request );
    Util.setObjPath( env, 'Action',  `${request}.${env.Action}`);
    Util.setObjPath( env, 'Intent',  `${request}.${env.Intent}`);
    Util.setObjPath( env, 'Default', `${request}.${env.Default}`);
  }

  return Promise.resolve( env );
};
exports.requestDefault = requestDefault;

var requestPermission = function( env ){
  var permissionList = Util.setting( env, 'Requirements/Permission/List' );

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
    var intent = {
      "intent": "actions.intent.PERMISSION",
      "data": {
        "@type": "type.googleapis.com/google.actions.v2.PermissionValueSpec",
        "permissions": permissions
      }
    };
    Util.setObjPath( env, 'Requirements/Intent', intent );
  }

  return requestDefault( env, 'Permission', true );
};
DefCon.get().then( defcon => {
  defcon.Setting.Requirements.Permission.List.map( entry => {
    var target = entry.Target;
    if( target ){
      requesters[target] = requestPermission;
    }
  });
});

var requestSignIn = function( env ){
  var status = Util.pathSetting( env, 'Requirements/SignIn/Status' );
  var additionalParameters = false;
  if( status ){
    // We aren't authenticated, but we have authentication status info,
    // so we shouldn't ask for it again, but will set the level with this.
    Util.setObjPath( env, 'IntentLevel', status );
    Util.setObjPath( env, 'ActionLevel', status );

  } else {
    // There is no status set, so this is probably first time requesting,
    // so we set the Intent we ask for.
    var intent = Util.setting( env, 'Requirements/SignIn/Intent', Template.evalIdentity );
    Util.setObjPath( env, 'Requirements/Intent', intent );
    additionalParameters  = true;
  }

  return requestDefault( env, 'SignIn', additionalParameters );
};
requesters['User/IsAuthenticated'] = requestSignIn; // FIXME

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

  // Store the counters for the node, action, intent, and outent
  // based on what they're set to.
  Util.setObjPathFrom( env, 'Counter[+]', 'Node'   );
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

var processLevelString = function( levelDef, env ){
  return Template.eval( levelDef, env );
};

var processLevelArray = function( levelDef, env ){
  var ret = 0;

  for( var co=0; co<levelDef.length && !ret; co++ ){
    var def = levelDef[co];
    var result = Template.evalBoolean( def, env );
    console.log('level', def, result);
    if( result ){
      ret = co+1;
    }
  }

  return ret;
};

var processLevelDef = function( levelDef, env ){
  if( typeof levelDef === 'string' ){
    return processLevelString( levelDef, env );
  } else if( Array.isArray( levelDef ) ){
    return processLevelArray( levelDef, env ) || '';
  } else {
    return '';
  }
};

var processLevel = function( env ){

  if( !env.IntentLevel ){
    var intentLevelDef = Util.pathSetting( env, 'IntentLevel' );
    env.IntentLevel    = processLevelDef( intentLevelDef, env );
  }
  console.log('processLevel IntentLevel', env.IntentLevel);

  if( !env.ActionLevel ){
    var actionLevelDef = Util.pathSetting( env, 'ActionLevel' );
    env.ActionLevel    = processLevelDef( actionLevelDef, env );
  }
  console.log('processLevel ActionLevel', env.ActionLevel);

  return Promise.resolve( env );
};

var processStackNamed = function( env, stackName, maxSize ){
  // Get the current stack, if it exists, and what the latest value might be
  var path = `Session/Stack/${stackName}`;
  var stack = Util.objPathsDefault( env, path, [] );
  var latest = stack[0];

  // Get the value we want to save (from the environment with this stack name)
  var val = Util.objPath( env, stackName );

  // If there is a value, and if its different than the latest value in the stack
  // then we should save it.
  if( typeof val !== 'undefined' && latest !== val ){
    // Put it at the front
    var size = stack.unshift( val );

    // If it is oversize, remove values from the back
    // A size <=0 means "unlimited"
    while( maxSize && maxSize > 0 && size > maxSize ){
      size = stack.pop();
    }

    Util.setObjPath( env, path, stack );
  }
}

var processStack = function( env ){
  var stackSize = Util.setting( env, 'Session/Stack/Size' );
  var stacks = Object.keys( stackSize );
  stacks.forEach( stack => processStackNamed( env, stack, stackSize[stacks] ) );
  return Promise.resolve( env );
}

var processFlexResponseIteration = function( env, targets ){
  var target = targets.shift();
  env['_Target'] = target;
  return Response.getFromSettings( env, target )
    .then( env => targets.length ? processFlexResponseIteration( env, targets ) : env );
}

var processFlexResponse = function( env ){
  var targets = Util.setting( env, 'FlexResponse/Targets' ).slice();
  return processFlexResponseIteration( env, targets );
}

var handleDefault = function( env ){
  return processCounters( env )
    .then( env => processLevel( env ) )
    .then( env => processStack( env ) )
    .then( env => processFlexResponse( env ) );
};
handlers['Default'] = handleDefault;
exports.handleDefault = handleDefault;


var handle = function( env ){
  if( env.Sent ){
    return Promise.resolve( env );
  }

  return timingBegin( env, 'Handle' )
    .then( env => {
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
      return handler( env );

    })
    .then( env => timingEnd( env, 'Handle' ) )
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
  Util.setObjPath( env, 'NoSuffixNeeded', noSuffixNeeded );

  if( noSuffixNeeded ){
    return Promise.resolve( env );
  }

  return Response.getFromSettings( env, 'Suffix' );
};

/**===================================================================*/

var formatMessageTemplate = function( env, source, target ){
  var template = Util.objPath( source, 'Template' );
  if( typeof template !== 'undefined' ){
    var val = Template.eval( template, env, Template.Methods.Str );
    console.log('formatMessageTemplate',source,val);
    if( typeof val !== 'undefined' ){
      Util.setObjPath( env, target, val );
    }
  }

  return Promise.resolve( env );
};

var formatMessageCopyFirst = function( env, source, target ){
  var copyFirst = source.CopyFirst;
  if( !Array.isArray(copyFirst) ){
    copyFirst = [copyFirst];
  }

  var sourcePaths = copyFirst.map( path => `${path}/${source.Target}` );
  var val = Util.objPathsDefault( env, sourcePaths );
  if( typeof val !== 'undefined' ){
    Util.setObjPath( env, target, val );
  }

  return Promise.resolve( env );
};

var formatMessageSource = function( env, source ){
  var target = source.Target;
  if( !target ){
    console.log('formatMessageSource no target', source);
  }

  // If a value has already been set, skip it.
  var sendPath = `Send/${target}`;
  if( Util.objPath( env, sendPath ) ){
    return Promise.resolve( env );
  }

  if( source.Template ){
    return formatMessageTemplate( env, source, sendPath );
  } else if( source.CopyFirst ){
    return formatMessageCopyFirst( env, source, sendPath );
  } else {
    console.log('formatMessageSource unable to handle', source);
  }
};

var formatMessageSources = function( env ){
  var sources = Util.setting( env, 'Send' );
  var sourcePromises = sources.map( source => formatMessageSource(env, source) );

  return Promise.all( sourcePromises )
    .then( () => Promise.resolve( env ) );
};

var formatMessage = function( env ){
  return formatMessageSources( env )
    .then( env => {
      var shouldRepeat = Util.objPathsDefault( env, 'Response/ShouldRepeat', false );
      Util.setObjPath(     env, 'Send/Remember/name', 'multivocal_repeat' );
      Util.setObjPath(     env, 'Send/Remember/lifespan', 1 );
      if( shouldRepeat ){
        // If we're repeating, copy the last repeat context
        Util.setObjPathFrom( env, 'Send/Remember/parameters', 'Context/multivocal_repeat/parameters' );
      } else {
        // This is a normal message, so save the info in case we repeat next time
        Util.setObjPathFrom( env, 'Send/Remember/parameters/Ssml', 'Send/Ssml' );
        Util.setObjPathFrom( env, 'Send/Remember/parameters/Text', 'Send/Text' );
      }
      return Promise.resolve( env );
    });
};

/**===================================================================*/

var formatSessionValue = function( env, paths, stringify ){
  var ret = Util.objPathsDefault( env, paths, {} );
  if( stringify ){
    ret = JSON.stringify( ret );
  }
  return ret;
};

var formatSession = function( env ){
  // TODO: stringify for Dialogflow 2, but not 3
  // TODO: make these more configurable
  var stringify = Util.objPath( env, 'Platform/IsDialogFlow' );
  var state       = formatSessionValue( env, 'Session/State',       stringify );
  var counter     = formatSessionValue( env, 'Session/Counter',     stringify );
  var consecutive = formatSessionValue( env, 'Session/Consecutive', stringify );
  var stack       = formatSessionValue( env, 'Session/Stack',       stringify );
  var context = {
    name: 'multivocal_session',
    lifespan: 99,
    parameters: {
      state: state,
      counter: counter,
      consecutive: consecutive,
      stack: stack,
      startTime: Util.objPath( env, 'Session/StartTime' )
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
  console.log('formatContextList',contextPath,contextList);
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

var formatPage = function( env ){
  var pageUrl = Util.setting( env, 'Page/Url', Template.Methods.Str );
  var pageCriteria = Util.setting( env, 'Page/Criteria', Template.Methods.Bool );

  // Only continue if we have a URL set and the device can support the feature
  console.log('formatPage', pageCriteria, pageUrl);
  if( !pageCriteria || !pageUrl ){
    return Promise.resolve( env );
  }

  var pageUrlStatePath = Util.setting( env, 'Page/UrlState/Path' );
  if( Array.isArray( pageUrlStatePath ) ){
    pageUrlStatePath = pageUrlStatePath[0];
  }
  var pageUrlState = Util.objPath( env, pageUrlStatePath );
  console.log('formatPage', pageUrl, pageUrlState, pageUrlStatePath );

  if( pageUrl ){
    if( pageUrl !== pageUrlState ){
      Util.setObjPath( env, 'Send/Page/Url',  pageUrl );
      Util.setObjPath( env, pageUrlStatePath, pageUrl );
    }

    // Supplement Data with some standard state
    var pageData = Util.pathSetting( env, 'Page/Data' );
    if( !pageData ){
      pageData = {};
    }
    var addStateSource = Util.setting( env, 'Page/IncludeEnvironment' );
    addStateSource.map( source => {
      var val = Util.objPath( env, source );
      Util.setObjPath( pageData, source, val );
    });

    var suppressMic = Util.pathSetting( env, 'Page/SuppressMic' );
    Util.setObjPath( env, 'Send/Page/SuppressMic', suppressMic );

    Util.setObjPath( env, 'Send/Page/Data', pageData );
  }
  return Promise.resolve( env );
};

/**
 * Needs to be done before we format session variables,
 * since we might change the NodeName stack
 * @param env
 * @return {Promise<any>}
 */
var formatNextNode = function( env ){
  var nextNode = Util.pathSetting( env, 'NextNode' );
  console.log('formatNextNode',{nextNode});

  if( nextNode && nextNode.match(/^\.+$/) ){
    var len = nextNode.length;
    var stack = Util.objPathsDefault( env, 'Session/Stack/NodeName', [] );
    for( var co=0; co<len; co++ ){
      nextNode = stack.shift();
    }
    Util.setObjPath( env, 'Session/Stack/NodeName', stack );
  }

  Util.setObjPath( env, 'Send/NextNode', nextNode );
  return Promise.resolve( env );
}

var formatShouldClose = function( env ){
  var shouldClose = Util.pathSetting( env, 'ShouldClose' );
  Util.setObjPath( env, 'Send/ShouldClose',         shouldClose );
  return Promise.resolve( env );
};

var formatRequirementsIntent = function( env ){
  var requirementsIntent = Util.objPath( env, 'Requirements/Intent' );

  if( requirementsIntent ){
    var sendIntent = Template.evalObj( requirementsIntent, env );
    if( sendIntent ){
      Util.setObjPath( env, 'Send/Intent', sendIntent );
    }
  }

  return Promise.resolve( env );
};

var formatTypeValues = function( nameKey, name, values ){
  if( typeof values === 'string' ){
    values = [values];
  }
  if( values.indexOf(name) === -1 ){
    values.push( name );
  }
  var entity = {
    synonyms: values
  };
  entity[nameKey] = name;
  return entity;
};

var formatTypeDialogflow = function( name, values, env ){
  var sessionName = Util.pathSetting( env, 'Session/Id' );
  var typeName = `${sessionName}/entityTypes/${name}`;

  var valueNames = Object.keys( values );
  var entities = valueNames.map( valueName => formatTypeValues( 'value', valueName, values[valueName] ) );

  var type = {
    name: typeName,
    entityOverrideMode: 'ENTITY_OVERRIDE_MODE_OVERRIDE',
    entities: entities
  };

  return type;
};

var formatTypeActionsBuilder = function( name, values, env ){
  var valueNames = Object.keys( values );
  var entities = valueNames.map( valueName => formatTypeValues( 'name', valueName, values[valueName] ) );

  var type = {
    name: name,
    mode: 'TYPE_REPLACE',
    synonym: {
      entries: entities
    }
  };

  return type;

}

var formatType = function( name, values, env ){
  if(
    Util.objPath( env, 'Platform/IsActionsOnGoogle') &&
    Util.objPath( env, 'Platform/ActionsSDKVersion') === '3'
  ){
    return formatTypeActionsBuilder( name, values, env );
  } else {
    return formatTypeDialogflow( name, values, env );
  }
}

var formatTypes = function( env ){
  var types = Util.objPathsDefault( env, 'Types', {} );
  var typeNames = Object.keys( types );
  var entityTypes = typeNames.map( typeName => formatType( typeName, types[typeName], env ) );

  Util.setObjPath( env, 'Send/Types', entityTypes );
  return Promise.resolve( env );
};

var formatDebug = function( env ){
  var context = {
    name: 'multivocal_debug',
    lifespan: 1,
    parameters: {}
  }

  var addSource = Util.setting( env, "Debug/PathList" );
  addSource.forEach( source => {
    var val = Util.objPath( env, source );
    var target = source;
    target = target.replace( /\/Debug$/i, '' );
    if( target === 'Debug' ){
      context.parameters = Object.assign( context.parameters, val );
    } else {
      Util.setObjPath( context.parameters, target, val );
    }
  })

  Util.setObjPath( env, 'Send/Debug', context );
  return Promise.resolve( env );
}

var JsonFormatter = require('./formatter');

var formatJson = function( env ){
  if( env.Sent ){
    return Promise.resolve( env );
  }

  if( !Util.objPath( env, 'Send/Json' ) ){
    var json = JsonFormatter.format( env );
    Util.setObjPath( env, 'Send/Json', json );
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
  console.log('Multivocal format', JSON.stringify(env.Msg,null,1));

  return timingBegin( env, 'Format' )
    .then( env => formatMessage( env ) )
    .then( env => formatPage( env ) )
    .then( env => formatNextNode( env ) )
    .then( env => formatSession( env ) )
    .then( env => formatTable( env ) )
    .then( env => formatShouldClose( env ) )
    .then( env => formatRequirementsIntent( env ) )
    .then( env => formatTypes( env ) )
    .then( env => formatDebug( env ) )
    .then( env => formatContexts( env ) )
    .then( env => formatJson( env ) )
    .then( env => timingEnd( env, 'Format' ) )
    .catch( err => {
      console.error( 'Multivocal format err', err );
      return Promise.reject( err );
    });
};

/**===================================================================*/

require('./standard').init();

var process = function( env ){

  if( env.Sent || Util.objPath( env, 'Send/Json' ) ){
    return Promise.resolve( env );
  }

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

/**===================================================================*/

var postprocessors = [];

var addPostprocessor = function( func ){
  postprocessors.push( func );
};
exports.addPostprocessor = addPostprocessor;

var postprocessTimer = function( env ){
  let now = Date.now();
  return timingBlocks( env )
    .then( env => {
      // Sort them by end time ascending (later times last)
      let timing = env.TimingBlocks.slice();
      timing.sort( (a,b) => {
        let as = a.End ? a.End : now;
        let bs = b.End ? b.End : now;
        let ret = as-bs;

        // If they end at the same time, use how long they've been recording
        if( !ret ){
          as = a.Diff ? a.Diff : 0;
          bs = b.Diff ? b.Diff : 0;
          ret = as-bs;
        }

        return ret;
      });

      // Display the results
      let results = 'timing results:\n';
      for( let co=0; co<timing.length; co++ ){
        results += ' ' + timing[co].Label + ' ' + timing[co].Diff + 'ms\n';
      }
      console.log( results );
      return Promise.resolve( env );
    });
};
addPostprocessor( postprocessTimer );

var postprocess = function( env ){
  return timingBegin( env, 'Postprocess' )
    .then( env => envFunctionsRecursive( env, postprocessors ) )
    .then( env => timingEnd( env, 'Postprocess') )
    .catch( err => {
      console.error( 'Problem during postprocessing', err );
      return Promise.reject( err );
    });
};
exports.postprocess = postprocess;

/**===================================================================*/

var processExpressParameters = function( request, response ){
  var env = {
    Body: request.body,
    Req: request,
    Res: response
  };
  return Promise.resolve( env );
};

var processExpressResponse = function( env ){
  var json = Util.objPath( env, 'Send/Json' );
  if( !env.Sent && json ){
    env.Res.send( json );
    env.Sent = true;
  }
  return Promise.resolve( env );
};

var processExpressWebhook = function( request, response ){
  return processExpressParameters( request, response )
    .then( env => preprocess( env ) )
    .then( env => process( env ) )
    .then( env => processExpressResponse( env ) )
    .then( env => postprocess( env ) );
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
  var json = Util.objPath( env, 'Send/Json' );
  if( !env.Sent && json ){
    var response = {
      statusCode: 200,
      headers: {},
      body: JSON.stringify( json )
    };
    env.Lambda.Callback( null, response );
    env.Sent = true;
  }
  return Promise.resolve( env );
};

var processLambdaWebhook = function( event, context, callback ){
  return processLambdaParameters( event, context, callback )
    .then( env => preprocess( env ) )
    .then( env => process( env ) )
    .then( env => processLambdaResponse( env ) )
    .then( env => postprocess( env ) );
};
exports.processLambdaWebhook = processLambdaWebhook;
