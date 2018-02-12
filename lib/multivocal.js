
const App = require('actions-on-google').DialogflowApp;
const Template = require('./template');
const Response = require('./response');
const Util = require('./util');

/**===================================================================*/

var Config;
var setConfig = function( conf ){
  Config = conf;
};
exports.setConfig = setConfig;

/**===================================================================*/

var builders = [];
exports.builders = builders;

var addBuilder = function( func ){
  builders.push( func );
};
exports.addBuilder = addBuilder;

var buildEnvLocale = function( env ){
  var locale = Util.val({
    env,
    settingPath:    [
      'Config/Setting/Locale/Path',
      'Config/Setting/Locale'
    ],
    settingDefault: ['Body/originalRequest/data/user/locale'],
    valueDefault:   'und'
  });
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
  env.Parameter = Util.val({
    env,
    settingPath:    [
      'Config/Setting/Parameters/Path',
      'Config/Setting/Parameters'
    ],
    settingDefault: ['Body/result/parameters'],
    valueDefault:   {}
  });
  return Promise.resolve( env );
};

var buildEnvContexts = function( env ){
  env.Context = {};

  // Load any contexts into a more useful environment attribute
  var contexts = env.App.getContexts();
  for( var co=0; co<contexts.length; co++ ){
    var context = contexts[co];
    var contextName = context.name;
    env.Context[contextName] = context;
  }

  return Promise.resolve( env );
};

var buildEnvState = function( env ){

  var userStorage = Util.val({
    env,
    settingPath: [
      'Config/Setting/User/State/Path',
      'Config/Setting/User/State'
    ],
    settingDefault: ['Body/originalRequest/data/user/userStorage'],
    valueDefault: '{}'
  });
  Util.setObjPath( env, 'User/State', JSON.parse(userStorage) );

  var sessionStorage = Util.val({
    env,
    settingPath: [
      'Config/Setting/Session/State/Path',
      'Config/Setting/Session/State'
    ],
    settingDefault: ['Context/multivocal_session/parameters/state'],
    valueDefault: '{}'
  });
  Util.setObjPath( env, 'Session/State', JSON.parse(sessionStorage) );


  return Promise.resolve( env );
};

var buildEnvPermissions = function( env ){
  var permissionsList = settingRequirementsPermissionList( env );

  permissionsList.map( entry => {
    var val = Util.objPath( env, entry.Source );
    if( typeof val !== 'undefined' ){
      Util.setObjPath( env, entry.Target, val );
    }
  });

  return Promise.resolve( env );
};

var buildEnvFeatureGroup = function( env, defaultSourcePath, destinationPath ){
  var surfaces = Util.val({
    env,
    settingPath: [
      `Config/Setting/${destinationPath}/Path`,
      `Config/Setting/${destinationPath}`
    ],
    settingDefault: defaultSourcePath,
    valueDefault: []
  });
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
  buildEnvFeatureGroup(
    env,
    ['Body/originalRequest/data/surface'],
    'Session/Feature'
  );
  buildEnvFeatureGroup(
    env,
    ['Body/originalRequest/data/availableSurfaces'],
    'User/Feature'
  );

  return Promise.resolve( env );
};

var buildEnvIntents = function( env ){

  env.IntentName = Util.val({
    env,
    settingPath:    ['Config/Setting/Intent/Path'],
    settingDefault: [
      'Context/multivocal_permission/properties/intent',
      'Body/result/metadata/intentName'
    ],
    valueDefault:   'Default'
  });
  env.Intent = Util.val({
    env,
    settingPath:    ['Config/Setting/Intent/Template'],
    settingDefault: 'Intent.{{IntentName}}',
    settingEval:    Template.Methods.Str
  });

  env.ActionName = Util.val({
    env,
    settingPath:    ['Config/Setting/Action/Path'],
    settingDefault: [
      'Context/multivocal_permission/properties/action',
      'Body/result/action'
    ],
    valueDefault:   'Default'
  });
  env.Action = Util.val({
    env,
    settingPath:    ['Config/Setting/Action/Template'],
    settingDefault: 'Action.{{ActionName}}',
    settingEval:    Template.Methods.Str
  });

  env.Default = Util.objPathsDefault( env, 'Config/Setting/Default/Template', 'Default' );

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

var buildEnv = function( request, response ){
  // Base information for our environment
  var env = {
    App: new App({request, response}),
    Body: request.body,
    Req: request,
    Res: response
  };

  return loadConfig( env )
    .then( env => buildEnvLocale( env ) )
    .then( env => buildEnvParameters( env ) )
    .then( env => buildEnvContexts( env ) )
    .then( env => buildEnvState( env ) )
    .then( env => buildEnvPermissions( env ) )
    .then( env => buildEnvFeatures( env ) )
    .then( env => buildEnvIntents( env ) )
    .then( env => buildEnvLocalRecursive( env, 0 ) )
    .then( env => Promise.resolve( env ) );
};

/**===================================================================*/

var loadConfig = function( env ){
  return Config.get()
    .then( config => {
      env.Config = config;
      return Promise.resolve( env );
    });
};

/**===================================================================*/

var loadVoice = function( env ){
  var sessionData = env.Session.State;

  var voices = Util.val({
    env,
    settingPath:    'Config/Setting/Voice/Path',
    settingDefault: [
      'Config/Local/{{Locale}}/Voice',
      'Config/Local/{{Lang}}/Voice',
      'Config/Local/und/Voice'
    ],
    valueDefault:   [
      {
        Name: 'Default'
      }
    ]
  });

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
    var index = Math.floor( Math.random() * size );
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

var settingRequirementsPermissionList = function( env ){
  return Util.val({
    env,
    settingPath:    'Config/Setting/Requirements/PermissionList',
    valueDefault: [
      {
        Source:     'Body/originalRequest/data/user/profile/givenName',
        Target:     'User/Name',
        Permission: 'NAME'
      },
      {
        Source:     'Body/originalRequest/data/device/location/coordinates',
        Target:     'Session/Location',
        Permission: 'DEVICE_PRECISE_LOCATION'
      }
    ]
  })
};

var requestPermission = function( env ){
  var permissionList = settingRequirementsPermissionList( env );

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
    var context = {
      name: 'multivocal_permission',
      lifespan: 1,
      parameters: {
        action: env.Action,
        intent: env.Intent
      }
    };
    Util.setObjPath( env, 'Requirements/Context', context );

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
// FIXME - can we get these from the PermissionMap keys?
requesters['User/Name'] = requestPermission;
requesters['Session/Location'] = requestPermission;

var requestRequirements = function( env ){
  var requirements = Util.val({
    env,
    settingPath:    'Config/Setting/Requirements/Path',
    settingDefault: [
      'Config/Local/{{Locale}}/Requirements/{{Intent}}',
      'Config/Local/{{Locale}}/Requirements/{{Action}}',
      'Config/Local/{{Locale}}/Requirements/Default',
      'Config/Local/{{Lang}}/Requirements/{{Intent}}',
      'Config/Local/{{Lang}}/Requirements/{{Action}}',
      'Config/Local/{{Lang}}/Requirements/Default',
      'Config/Local/und/Requirements/{{Intent}}',
      'Config/Local/und/Requirements/{{Action}}',
      'Config/Local/und/Requirements/Default'
    ],
    valueDefault: 'Body'
  });
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

var handleDefault = function( env ){
  Util.incObjPath( env, 'Session/State/NumVisits' );

  var responseNames = Util.val({
    env,
    settingPath:    'Config/Setting/Response/Path',
    settingDefault: [
      'Config/Local/{{Locale}}/Response/{{Outent}}',
      'Config/Local/{{Locale}}/Response/{{Intent}}',
      'Config/Local/{{Locale}}/Response/{{Action}}',
      'Config/Local/{{Locale}}/Response/{{Default}}',
      'Config/Local/{{Lang}}/Response/{{Outent}}',
      'Config/Local/{{Lang}}/Response/{{Intent}}',
      'Config/Local/{{Lang}}/Response/{{Action}}',
      'Config/Local/{{Lang}}/Response/{{Default}}',
      'Config/Local/und/Response/{{Outent}}',
      'Config/Local/und/Response/{{Intent}}',
      'Config/Local/und/Response/{{Action}}',
      'Config/Local/und/Response/{{Default}}'
    ]
  });
  var responseField = Util.val({
    env,
    settingPath:    'Config/Setting/Response/EnvField',
    settingDefault: 'Response'
  });
  var responseBase = Util.val({
    env,
    settingPath:    'Config/Setting/Response/Base',
    settingDefault: {
      TemplateEnvMap: {
        "Template": "Msg",
        "TemplateCard": "Card"
      }
    },
    settingEval: Template.Methods.Identity
  });
  return Response.get( env, responseNames, responseField, responseBase );
};
handlers['Default'] = handleDefault;
exports.handleDefault = handleDefault;

var handleActionWelcome = function( env ){
  Util.incObjPath( env,    'User/State/NumVisits' );
  return handleDefault( env );
};
handlers['Action.welcome'] = handleActionWelcome;

var handleActionQuit = function( env ){
  return handleDefault( env )
    .then( env => {
      env.Response.ShouldClose = true;
      return Promise.resolve( env );
    })
};
handlers['Action.quit'] = handleActionQuit;

var handleIntentInputNone = function( env ){
  env.RepromptCount = env.App.getRepromptCount();
  env.RepromptFinal = env.App.isFinalReprompt();
  return handleDefault( env );
};
handlers['Intent.input.none'] = handleIntentInputNone;

var handle = function( env ){
  if( env.Sent ){
    return Promise.resolve( env );
  }

  var handler;
  var handlerName;
  var handlerNames = Util.val({
    env,
    settingPath:    'Config/Setting/HandlerNames',
    settingDefault: [
      '{{Intent}}',
      '{{Action}}',
      '{{Default}}',
      'Default'
    ]
  });
  for( var co=0; co<handlerNames.length && !handler; co++ ){
    handlerName = handlerNames[co];
    handler = handlers[handlerName];
  }
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

  var endsWithQmark = env.Msg && env.Msg.endsWith( '?' );
  var shouldClose = env.Response.ShouldClose;
  var noSuffixNeeded = endsWithQmark || shouldClose;
  if( noSuffixNeeded ){
    return Promise.resolve( env );
  }

  var responseNames = Util.val({
    env,
    settingPath:    'Config/Setting/Suffix/Path',
    settingDefault: [
      'Config/Local/{{Locale}}/Suffix/{{Outent}}',
      'Config/Local/{{Locale}}/Suffix/{{Intent}}',
      'Config/Local/{{Locale}}/Suffix/{{Action}}',
      'Config/Local/{{Locale}}/Suffix/{{Default}}',
      'Config/Local/{{Lang}}/Suffix/{{Outent}}',
      'Config/Local/{{Lang}}/Suffix/{{Intent}}',
      'Config/Local/{{Lang}}/Suffix/{{Action}}',
      'Config/Local/{{Lang}}/Suffix/{{Default}}',
      'Config/Local/und/Suffix/{{Outent}}',
      'Config/Local/und/Suffix/{{Intent}}',
      'Config/Local/und/Suffix/{{Action}}',
      'Config/Local/und/Suffix/{{Default}}'
    ]
  });
  var responseField = Util.val({
    env,
    settingPath:    'Config/Setting/Suffix/EnvField',
    settingDefault: 'ResponseSuffix'
  });
  var responseBase = Util.val({
    env,
    settingPath:    'Config/Setting/Suffix/Base',
    settingDefault: {
      TemplateEnvMap: {
        "Template": "Suffix"
      }
    },
    settingEval: Template.Methods.Identity
  });

  return Response.get( env, responseNames, responseField, responseBase )
    .then( env => {
      // FIXME - eliminate this hardcoding of the empty string (should be Handlebars function)
      if( !env.Suffix ){
        env.Suffix = '';
      }
      return Promise.resolve( env );
    });
};

/**===================================================================*/

// TODO - Refactor and move to separate module
var ssmlHandlebar = function( voice, options ){

  var openTag = function( tag, params ){
    var ret = '';
    if( params ){
      ret = '<'+tag;
      var keys = Object.keys(params);
      for( var co=0; co<keys.length; co++ ){
        var key = keys[co];
        var val = params[key];
        ret += ` ${key}="${val}"`;
      }
      ret += '>';
    }
    return ret;
  };

  var closeTag = function( tag, params ){
    var ret = '';
    if( params ){
      ret = `</${tag}>`;
    }
    return ret;
  };

  var out = '<speak>';
  out += openTag( 'voice', voice.Voice );
  out += openTag( 'prosody', voice.Prosody );
  out += options.fn( options.data.root );
  out += closeTag( 'prosody', voice.Prosody );
  out += closeTag( 'voice', voice.Voice );
  out += '</speak>';

  var ret = new Template.Handlebars.SafeString( out );
  return ret;
};
Template.Handlebars.registerHelper( 'ssml', ssmlHandlebar );

var sendMessageContent = function( env, envName, template ){
  // If a value has already been set, skip it.
  if( env[envName] ){
    return Promise.resolve( env );
  }

  var val = Util.val({
    env,
    settingPath:    [
      'Config/Setting/${envName}/Template',
      'Config/Setting/${envName}'
    ],
    settingDefault: template,
    settingEval:    Template.Methods.Str
  });
  env[envName] = val;
  return Promise.resolve( env );
};

var sendMessage = function( env ){
  return sendMessageContent( env, 'Ssml', '{{#ssml Voice}}{{{Msg}}} {{{Suffix}}}{{/ssml}}' )
    .then( env => sendMessageContent( env, 'Txt', '{{{Msg}}} {{{Suffix}}}') );
};

/**===================================================================*/

var sendSession = function( env ){
  var val = Util.objPathsDefault( env, 'Session/State', {} );
  var context = {
    name: 'multivocal_session',
    lifespan: 99,
    parameters: {
      state: JSON.stringify( val )
    }
  };
  Util.setObjPath( env, 'Send/Session', context );
  return Promise.resolve( env );
};

var sendContext = function( env, context ){
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

var sendContextList = function( env, contextPath ){
  var contextList = Util.objPath( env, contextPath );
  if( !contextList ){
    return Promise.resolve( null );
  }

  // If there is just one Context, not a list, process it
  if( !Array.isArray( contextList ) ){
    return sendContext( env, contextList );
  }

  // We have a list of Contexts, process all of them
  var promises = contextList.map( context => sendContext( env, context ) );
  return Promise.all( promises )
    .catch( err => {
      console.error( 'Multivocal sendContextList err', err );
      return Promise.reject( err );
    });
};

var sendContexts = function( env ){
  var contextPathList = Util.val({
    env,
    settingPath:    'Config/Setting/Context/Path',
    settingDefault: [
      'Requirements/Context',
      'Send/Session',
      'Response/Context',
      'ResponseSuffix/Context'
    ]
  });
  var promises = contextPathList.map( contextPath => sendContextList( env, contextPath ) );
  return Promise.all( promises )
    .then( result => {
      var contexts = Util.objPathsDefault( env, 'Send/Context', {} );
      // var contextList = Object.values(contexts);  // Requires Node 7+. So use next line instead.
      var contextList = Object.keys(contexts).map(k=>contexts[k]);
      Util.setObjPath( env, 'Send/ContextList', contextList );

      return Promise.resolve( env );
    })
    .catch( err => {
      console.error( 'Multivocal sendContexts err', err );
      return Promise.reject( err );
    });
};

var sendShouldClose = function( env ){
  var shouldClose = Util.val({
    env,
    settingPath:    'Config/Setting/ShouldClose/Path',
    settingDefault: [
      'ShouldClose',
      'Response/ShouldClose',
      'ResponseSuffix/ShouldClose'
    ],
    valueDefault: false
  });
  Util.setObjPath( env, 'Send/ShouldClose',         shouldClose );
  return Promise.resolve( env );
};


var JsonBuilder = require('./builder')({
  'Send/ContextList': 'contextOut',
  'Send/ShouldClose': {
    Target: 'data/google/expectUserResponse',
    Value: '{{not Send.ShouldClose}}',
    ValueType: 'boolean'
  },
  'Ssml': {
    Target: [
      'data/google/richResponse/items[0]/simpleResponse/ssml',
      'speech'
    ]
  },
  'Txt': {
    Target: [
      'data/google/richResponse/items[0]/simpleResponse/displayText',
      'displayText'
    ]
  },
  'Card': 'data/google/richResponse/items[+]/basicCard',
  'User/State':{
    Target: 'data/google/userStorage',
    ValueType: 'string'
  },
  'Requirements/Intent':'data/google/systemIntent'
});

/**
 * This is actually mostly for testing/debugging
 * @param env
 * @returns {Promise.<*>}
 */
var sendViaApp = function( env ){
  if( env.Sent || !(env.Send.ViaApp) ){
    return Promise.resolve( env );
  }

  var shouldClose = env.Send.ShouldClose;
  var simpleResponse = {
    speech:      env.Ssml,
    displayText: env.Txt
  };
  var richResponse = env.App.buildRichResponse()
    .addSimpleResponse( simpleResponse )
    .addBasicCard(
      env.App.buildBasicCard()
        .setTitle('Test Title')
        .setBodyText('Test body')
    );
  if( shouldClose ){
    env.App.tell( richResponse );
  } else {
    env.App.ask( richResponse );
  }
  env.Sent = true;
  return Promise.resolve( env );
};

var sendJson = function( env ){
  if( env.Sent ){
    return Promise.resolve( env );
  }

  if( !env.Send.Json ){
    var json = JsonBuilder.build( env );
    env.Send.Json = json;
  }

  env.Res.send( env.Send.Json );
  env.Sent = true;

  return Promise.resolve( env );
};

var send = function( env ){
  if( env.Sent ){
    return Promise.resolve( env );
  }

  env.Send = {
    ViaApp: false
  };

  return sendMessage( env )
    .then( env => sendSession( env ) )
    .then( env => sendContexts( env ) )
    .then( env => sendShouldClose( env ) )
    .then( env => sendViaApp( env ) )
    .then( env => sendJson( env ) )
    .catch( err => {
      console.error( 'Multivocal send err', err );
      return Promise.reject( err );
    });
};

/**===================================================================*/

exports.process = function( request, response ){

  // Build the initial environment
  return buildEnv( request, response )

    // Set the "voice" field for the environment
    .then( env => loadVoice( env ) )

    // See if there are any prerequisites/requirements
    .then( env => requestRequirements( env ) )

    // Determine what handler we should call and call it
    .then( env => handle( env ) )

    // If there needs to be anything else on the reply (like asking
    // a question) figure that out here.
    .then( env => addSuffix( env ) )

    // Send a response if one hasn't already been sent
    .then( env => send( env ) )

    .catch( err => {
      console.error( 'Problem during processing', err );
      return Promise.reject( err );
    });
};