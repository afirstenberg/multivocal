
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

var buildEnvIntents = function( env ){

  env.IntentName = Util.val({
    env,
    settingPath:    ['Config/Setting/Intent/Path'],
    settingDefault: ['Body/result/metadata/intentName'],
    valueDefault:   'Default'
  });
  env.Intent = Util.val({
    env,
    settingPath:    ['Config/Setting/Intent/Template'],
    settingDefault: 'Intent.{{IntentName}}'
  });

  env.ActionName = Util.val({
    env,
    settingPath:    ['Config/Setting/Action/Path'],
    settingDefault: ['Body/result/action'],
    valueDefault:   'Default'
  });
  env.Action = Util.val({
    env,
    settingPath:    ['Config/Setting/Action/Template'],
    settingDefault: 'Action.{{ActionName}}'
  });

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
  var sessionData = env.App.data;

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
  env.App.data.Voice = env.Voice;
  return Promise.resolve( env );
};
exports.loadVoice = loadVoice;

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
  var responseNames = Util.val({
    env,
    settingPath:    'Config/Setting/Response/Path',
    settingDefault: [
      'Config/Local/{{Locale}}/Response/{{Outent}}',
      'Config/Local/{{Locale}}/Response/{{Intent}}',
      'Config/Local/{{Locale}}/Response/{{Action}}',
      'Config/Local/{{Locale}}/Response/Default',
      'Config/Local/{{Lang}}/Response/{{Outent}}',
      'Config/Local/{{Lang}}/Response/{{Intent}}',
      'Config/Local/{{Lang}}/Response/{{Action}}',
      'Config/Local/{{Lang}}/Response/Default',
      'Config/Local/und/Response/{{Outent}}',
      'Config/Local/und/Response/{{Intent}}',
      'Config/Local/und/Response/{{Action}}',
      'Config/Local/und/Response/Default'
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
        "Template": "Msg"
      }
    }
  });
  return Response.get( env, responseNames, responseField, responseBase );
};
handlers['Default'] = handleDefault;
exports.handleDefault = handleDefault;

var handleActionWelcome = function( env ){
  env.App.userStorage.NumVisits = env.App.userStorage.NumVisits ? env.App.userStorage.NumVisits+1 : 1;
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
  var handler;
  var handlerName;
  var handlerNames = Util.val({
    env,
    settingPath:    'Config/Setting/HandlerNames',
    settingDefault: [
      '{{Intent}}',
      '{{Action}}',
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
      'Config/Local/{{Locale}}/Suffix/Default',
      'Config/Local/{{Lang}}/Suffix/{{Outent}}',
      'Config/Local/{{Lang}}/Suffix/{{Intent}}',
      'Config/Local/{{Lang}}/Suffix/{{Action}}',
      'Config/Local/{{Lang}}/Suffix/Default',
      'Config/Local/und/Suffix/{{Outent}}',
      'Config/Local/und/Suffix/{{Intent}}',
      'Config/Local/und/Suffix/{{Action}}',
      'Config/Local/und/Suffix/Default'
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
    }
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

var buildMessageContent = function( env, envName, template ){
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
  return Promise.resolve( val );
};

var buildMessage = function( env ){
  return buildMessageContent( env, 'Ssml', '{{#ssml Voice}}{{{Msg}}} {{{Suffix}}}{{/ssml}}' )
    .then( env => buildMessageContent( env, 'Txt', '{{{Msg}}} {{{Suffix}}}') );
};

/**===================================================================*/

var sendContext = function( app, context ){
  if( typeof context === 'string' ){
    context = {
      name: context,
      lifetime: 5
    }
  }
  if( !context.parameters ){
    context.parameters = {};
  }
  app.setContext( context.name, context.lifetime, context.parameters );
  return Promise.resolve( context );
};

var sendContextList = function( env, contextPath ){
  var app = env.App;
  var contextList = Util.objPath( env, contextPath );
  if( !contextList ){
    return Promise.resolve( null );
  }

  // If there is just one Context, not a list, process it
  if( !Array.isArray( contextList ) ){
    return sendContext( app, contextList );
  }

  // We have a list of Contexts, process all of them
  var promises = contextList.map( context => sendContext( app, context ) );
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
      'Response/Config',
      'ResponseSuffix/Config'
    ]
  });
  var promises = contextPathList.map( contextPath => sendContextList( env, contextPath ) );
  return Promise.all( promises )
    .then( result => Promise.resolve( env ) )
    .catch( err => {
      console.error( 'Multivocal sendContexts err', err );
      return Promise.reject( err );
    });
};

var sendMessage = function( env ){
  if( env.Sent ){
    return Promise.resolve( env );
  }

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
  var simpleResponse = {
    speech:      env.Ssml,
    displayText: env.Txt
  };
  if( shouldClose ){
    env.App.tell( simpleResponse );
  } else {
    env.App.ask( simpleResponse );
  }
  env.Sent = true;
  return Promise.resolve( env );
};

var send = function( env ){
  if( env.Sent ){
    return Promise.resolve( env );
  }

  return buildMessage( env )
    .then( env => sendContexts( env ) )
    .then( env => sendMessage( env ) )
    .catch( err => {
      console.error( 'Multivocal send err', err );
      return Promise.reject( err );
    });
};

/**===================================================================*/

exports.process = function( request, response ){

  // Build the initial environment
  buildEnv( request, response )

    // Set the "voice" field for the environment
    .then( env => loadVoice( env ) )

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