
const Template = require('./template');
const Response = require('./response');
const Util = require('./util');
const Auth = require('./auth');
const Log = require('./log');
const Timing = require('./timing');

const Config = require('./multivocalConfig');
const Preprocessors = require('./multivocalPreprocessors');
const Builders = require('./multivocalBuilders');
const Format = require('./multivocalFormat');
const Postprocessors = require('./multivocalPostprocessors');

/**===================================================================*/

exports.Config = Config.source;
exports.setConfig = Config.setConfig;
exports.addConfig = Config.addConfig;
exports.getConfig = Config.getConfig;

exports.addPrepprocessor = Preprocessors.addPreprocessor;
exports.addBuilder = Builders.addBuilder;
exports.addPostprocessor = Postprocessors.addPostprocessor;

/**===================================================================*/

var loadVoice = function( env ){
  var sessionData = env.Session.State;

  // We must load the voices first, since picking one may require this
  var voices = Util.pathSetting( env, 'Voice/Voices' );
  env.Voices = voices;

  var voiceName = Util.pathSetting( env, 'Voice/Name' );
  var voice = voices[voiceName];
  console.log('loadVoice', {voices,voiceName,voice});

  voice.Name = voiceName;

  env.Voice  = voice;
  env.VoiceName = voiceName;
  env.Session.State.Voice = voiceName;

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
Config.DefCon.get().then( defcon => {
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

var processReloadVoice = function( env ){
  var shouldReload = Util.setting( env, 'Voice/ShouldReload/Criteria', Template.Methods.Bool );
  console.log('processReloadVoice',shouldReload);
  if( shouldReload ){
    return loadVoice( env );
  }
  return Promise.resolve( env );
}

var handleDefault = function( env ){
  return processCounters( env )
    .then( env => processLevel( env ) )
    .then( env => processStack( env ) )
    .then( env => processFlexResponse( env ) )
    .then( env => processReloadVoice( env ) );
};
handlers['Default'] = handleDefault;
exports.handleDefault = handleDefault;


var handle = function( env ){
  if( env.Sent ){
    return Promise.resolve( env );
  }

  return Timing.begin( env, 'Handle' )
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
      return Timing.begin( env, `Handle ${handlerName}` )
        .then( env => handler( env ) )
        .then( env => Timing.end( env, `Handle ${handlerName}`) );

    })
    .then( env => Timing.end( env, 'Handle' ) )
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

require('./standard').init();

var doprocess = function( env ){

  if( env.Sent || Util.objPath( env, 'Send/Json' ) ){
    return Promise.resolve( env );
  }

  return Timing.begin( env, 'Process' )

    // Build the initial environment
    .then( env => Builders.buildEnv( env ) )

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
    .then( env => Format.format( env ) )

    .then( env => Timing.end( env, 'Process' ) )

    .catch( err => {
      console.error( 'Problem during processing', err );
      return Promise.reject( err );
    });
};
exports.process = doprocess;


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
    .then( env => Preprocessors.preprocess( env ) )
    .then( env => doprocess( env ) )
    .then( env => processExpressResponse( env ) )
    .then( env => Postprocessors.postprocess( env ) );
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
    .then( env => Preprocessors.preprocess( env ) )
    .then( env => doprocess( env ) )
    .then( env => processLambdaResponse( env ) )
    .then( env => Postprocessors.postprocess( env ) );
};
exports.processLambdaWebhook = processLambdaWebhook;
