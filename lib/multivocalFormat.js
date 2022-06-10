const JsonFormatter = require('./formatter');
const Util = require( "./util" );
const Template = require( "./template" );
const Timing = require( "./timing" );
const {NamedFunctionSequence} = require( "./namedSequence" );

const formatters = new NamedFunctionSequence({
  Timing: 'Format'
})

exports.add = formatters.add;

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

async function Message( env ){
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
exports.message = Message;
formatters.add( Message )

/**===================================================================*/

function Page( env ){
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
formatters.add( Page )

/**
 * Needs to be done before we format session variables,
 * since we might change the NodeName stack
 * @param env
 * @return {Promise<any>}
 */
function NextNode( env ){
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
formatters.add( NextNode )

var formatSessionValue = function( env, paths, stringify ){
  var ret = Util.objPathsDefault( env, paths, {} );
  if( stringify ){
    ret = JSON.stringify( ret );
  }
  return ret;
};

function Session( env ){
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
}
formatters.add( Session )

function Table( env ){
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
}
formatters.add( Table )

function ShouldClose( env ){
  var shouldClose = Util.pathSetting( env, 'ShouldClose' );
  Util.setObjPath( env, 'Send/ShouldClose',         shouldClose );
  return Promise.resolve( env );
}
formatters.add( ShouldClose )

function RequirementsIntent( env ){
  var requirementsIntent = Util.objPath( env, 'Requirements/Intent' );

  if( requirementsIntent ){
    var sendIntent = Template.evalObj( requirementsIntent, env );
    if( sendIntent ){
      Util.setObjPath( env, 'Send/Intent', sendIntent );
    }
  }

  return Promise.resolve( env );
}
formatters.add( RequirementsIntent )

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

function Types( env ){
  var types = Util.objPathsDefault( env, 'Types', {} );
  var typeNames = Object.keys( types );
  var entityTypes = typeNames.map( typeName => formatType( typeName, types[typeName], env ) );

  Util.setObjPath( env, 'Send/Types', entityTypes );
  return Promise.resolve( env );
}
formatters.add( Types )

function Debug( env ){
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
formatters.add( Debug )

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
}

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
}

function Contexts( env ){
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
}
formatters.add( Contexts )

function Json( env ){
  if( env.Sent ){
    return Promise.resolve( env );
  }

  if( !Util.objPath( env, 'Send/Json' ) ){
    var json = JsonFormatter.format( env );
    Util.setObjPath( env, 'Send/Json', json );
  }

  return Promise.resolve( env );
}
exports.json = Json;
formatters.add( Json )

async function format( env ){
  if( env.Sent ){
    return Promise.resolve( env );
  }

  env.Send = {
    ViaApp: false
  };
  console.log('Multivocal format', JSON.stringify(env.Msg,null,1));

  env = formatters.exec( env )
  return env
};
exports.format = format;