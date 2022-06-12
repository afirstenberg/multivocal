const Util = require( "./util" );
const Template = require( "./template" );
const Response = require( "./response" );
const Timing = require( "./timing" );

const {loadVoice} = require('./multivocalBuilders')
const {NamedFunctionSequence} = require( "./namedSequence" );

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


const defaultProcessors = new NamedFunctionSequence({
  Timing: 'HandleDefault'
})
exports.defaultProcessors = defaultProcessors;

async function Counters( env ){
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
}
defaultProcessors.add( Counters )

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

async function Level( env ){

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
}
defaultProcessors.add( Level )

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

async function Stack( env ){
  var stackSize = Util.setting( env, 'Session/Stack/Size' );
  var stacks = Object.keys( stackSize );
  stacks.forEach( stack => processStackNamed( env, stack, stackSize[stacks] ) );
  return Promise.resolve( env );
}
defaultProcessors.add( Stack )

var processFlexResponseIteration = function( env, targets ){
  var target = targets.shift();
  env['_Target'] = target;
  return Response.getFromSettings( env, target )
    .then( env => targets.length ? processFlexResponseIteration( env, targets ) : env );
}

async function FlexResponse( env ){
  var targets = Util.setting( env, 'FlexResponse/Targets' ).slice();
  return processFlexResponseIteration( env, targets );
}
defaultProcessors.add( FlexResponse )

async function ReloadVoice( env ){
  var shouldReload = Util.setting( env, 'Voice/ShouldReload/Criteria', Template.Methods.Bool );
  console.log('processReloadVoice',shouldReload);
  if( shouldReload ){
    return loadVoice( env );
  }
  return Promise.resolve( env );
}
defaultProcessors.add( ReloadVoice )

async function handleDefault( env ){
  if( !env.Handled ){
    env = await defaultProcessors.exec( env )
    env.Handled = true
  }
  return env
}
handlers['Default'] = handleDefault;
exports.handleDefault = handleDefault;


const handleProcessors = new NamedFunctionSequence({
  Timing: 'Handle'
})
exports.handleProcessors = handleProcessors

async function HandlerName( env ){
  // Get the possible handler names we might use
  // and locate a handler that has been registered for that name.
  let handler;
  let handlerName;
  const handlerNames = Util.setting( env, 'Handler/Names', Template.Methods.Array );
  for( let co=0; co<handlerNames.length && !handler; co++ ){
    handlerName = handlerNames[co];
    handler = handlers[handlerName];
  }
  Util.setObjPath( env, 'HandlerName', handlerName );

  return env;
}
handleProcessors.add( HandlerName )

async function HandlerCounter( env ){
  const handlerCounter = Util.setting( env, 'Handler/Counter', Template.Methods.Str );
  Util.setObjPath( env, 'Counter[+]', handlerCounter );
  return env
}
handleProcessors.add( HandlerCounter )

async function CallHandler( env ){
  const handlerName = env.HandlerName
  const handler = handlers[handlerName]
  if( handler ){
    env = await Timing.begin( env, `Handle ${handlerName}` )
    env = await handler( env )
    env = await Timing.end( env, `Handle ${handlerName}` )
  }
  return env
}
handleProcessors.add( CallHandler )

async function HandleDefault( env ){
  // If we haven't fully handled it yet, call the default handler
  if( !env.Handled && handlers['Default'] ){
    env = await handlers['Default']
  }
  return env
}
handleProcessors.add( HandleDefault )

async function handle( env ){
  if( env.Sent ){
    return Promise.resolve( env );
  }

  env = handleProcessors.exec( env )

  return env
}
exports.handle = handle;