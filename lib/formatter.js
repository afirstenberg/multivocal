
const Template = require('./template');
const Util = require('./util');

var taskSources = {
  "aog2-dialogflow1": "../config/format-aog2-dialogflow1.js",
  "aog2-dialogflow2": "../config/format-aog2-dialogflow2.js",
  "hangouts-dialogflow2.js": "../config/format-hangouts-dialogflow2.js",
  "dialogflow3.js":   "../config/format-dialogflow3.js",
  "aog3-ab":          "../config/format-aog3-ab.js"
};

var formatTaskList = {};
exports.formatTaskList = formatTaskList;

/*
 * incBase is the default increment for each task order used by a builder
 * incDropoff is how much this is divided by each time we extend
 */
var incDropoff = 100;
var incBase = incDropoff**3;

var addTasks = function( name, tasks ){
  if( !tasks.isFormatTasksObject ){
    var obj = new FormatTasks( tasks );
    tasks = obj;
  }
  formatTaskList[name] = tasks;
};
exports.addTasks = addTasks;


var format = function( env ){
  var ret;
  var keys = Object.keys( formatTaskList );
  for( var co=0; co<keys.length && !ret; co++ ){
    var key = keys[co];
    var formatTasks = formatTaskList[key];
    var criteria = formatTasks.criteria;
    var shouldEval = Template.evalBoolean( criteria, env );
    //console.log('Formatter format', key, criteria, shouldEval);
    //console.log(env.Platform);
    if( shouldEval ){
      ret = formatTasks.build( env );
    }
  }
  if( !ret ){
    console.error("No Formatter found");
  }
  return ret;
};
exports.format = format;


var normalizeTask = function( builder, detailSource, hash, order, key ){
  // If this is a simple entry, convert it to an object
  // otherwise make a copy of the object
  var details;
  if( typeof detailSource === 'string' ){
    details = {
      Target: detailSource
    };
  } else {
    details = {...detailSource};
  }

  if( !details.Source && key ){
    details.Source = key;
  }

  var old = hash[details.Source];
  if( old ){
    details.Order = old.Order;
    var index = builder.tasks.indexOf( old );
    builder.tasks.splice( index, 1 );
  }

  if( details.After ){
    var previous = hash[details.After];
    if( previous ){
      details.Order = previous.Order + builder.inc;
    }
  }

  if( !details.Order ){
    details.Order = order;
  }

  // details.Criteria
  // details.Value
  // details.ValueType

  return details;
};

var setTasks = function( builder, tasks ){

  var compareTasks = function( a, b ){
    return a.Order - b.Order;
  };

  // Sort the tasks
  var sortedTasks = tasks.sort( compareTasks );

  // Reset the increment
  builder.inc = incBase;

  var order = incBase;
  sortedTasks.forEach( task => {
    task.Order = order;
    order += incBase;
  });

  builder.tasks = sortedTasks;
  builder.isClean = true;
}

var generateTasks = function( builder, config ){
  var tasks = builder.tasks || [];
  var taskNamed = builder.taskNamed || {};
  var order = tasks.length ? tasks[tasks.length-1].Order : 0;
  order += builder.inc;

  if( Array.isArray( config ) ){
    generateTasksFromArray( builder, config, tasks, taskNamed, order );
  } else {
    generateTasksFromObj( builder, config, tasks, taskNamed, order );
  }
}

var generateTasksFromObj = function( builder, config, tasks, taskNamed, order ){
  var keys = Object.keys( config );
  for( var co=0; co<keys.length; co++ ){
    var key = keys[co];
    var details = config[key];

    details = normalizeTask( builder, details, taskNamed, order, key );

    tasks.push( details );
    taskNamed[details.Source] = details;
    order = details.Order + builder.inc;
  }

  builder.taskNamed = taskNamed;
  setTasks( builder, tasks );
  return builder;
};

var generateTasksFromArray = function( builder, config, tasks, taskNamed, order ){
  for( var co=0; co<config.length; co++ ){
    var details = config[co];

    details = normalizeTask( builder, details, taskNamed, order );

    tasks.push( details );
    taskNamed[details.Source] = details;
    order = details.Order + builder.inc;
  }

  builder.taskNamed = taskNamed;
  setTasks( builder, tasks );
  return builder;
};

var addTask = function( builder, details ){
  var source = details.Source;
  var sourceOrder = builder.taskNamed[source].Order;

  details = normalizeTask( builder, details, builder.taskNamed, sourceOrder, source );
  builder.taskNamed[source] = details;
  builder.isClean = false;

  return builder;
};

var regenerateTasks = function( builder ){
  if( !builder.isClean ){
    generateTasksFromObj( builder, builder.taskNamed )
  }
};

var build = function( builder, env ){
  regenerateTasks( builder );

  var envName = builder.envName;
  env[envName] = {
    // TODO - There was something I wanted to put here....
  };

  var obj = {};
  var tasks = builder.tasks;
  for( var co=0; co<tasks.length; co++ ){
    var task = tasks[co];
    env[envName].Task = task;
    env[envName].InProgress = obj;
    buildTask( task, env, obj );
  }

  return obj;
};

var buildTask = function( task, env, obj ){
  if( task.Debug ){
    console.log('Formatter buildTask', task.Source, Template.evalArray( task.Debug, env ) );
  }

  var shouldEvaluate = true;
  var sourceValue = Util.objPath( env, task.Source );
  if( task.Criteria ){
    shouldEvaluate = Template.evalBoolean( task.Criteria, env );
  } else if( !sourceValue ){
    shouldEvaluate = false;
  }
  //console.log('Builder shouldEvaluate', task.Source, shouldEvaluate );
  if( !shouldEvaluate ){
    return false;
  }

  var value = task.Value;
  if( value && typeof value === 'string' ){
    value = Template.evalConcatStr( value, env );
  } else if( !value ){
    value = sourceValue;
  }

  // If we don't have a value - we can't build anything here
  if( typeof value === 'undefined' ){
    return false;
  }

  if( task.ValueType === 'number' ){
    value = parseInt( value, 10 );

  } else if( task.ValueType === 'boolean' ){
    value = !(value.toLowerCase() === 'false')

  } else if( task.ValueType === 'string' ){
    switch( typeof value ){
      case 'object': value = JSON.stringify( value );   break;
      case 'number': value = `${value}`;                break;
      case 'boolean': value = value ? 'true' : 'false'; break;
    }
  }

  buildTarget( task.Target,    obj, value, env );
  buildTarget( task.TargetEnv, env, value, env );

  return true;
};

var buildTarget = function( targets, targetObj, value, env ){
  if( targets ){
    if( !Array.isArray(targets) ){
      targets = [targets];
    }
    targets = Template.evalArray( targets, env );
    targets.map( target => Util.setObjPath( targetObj, target, value ) );
  }
};

var FormatTasks = function( config ){
  this.addTask = (task) => addTask( this, task );
  this.regenerateTasks = () => regenerateTasks( this );
  this.build = (env) => build( this, env );
  this.dump = () => console.log( 'FormatTasks dump', this );

  this.inc = incBase;

  this.isFormatTasksObject = true;
  this.criteria = config.criteria;
  this.envName = config.envName ? config.envName : 'Build';

  if( config.extends ){
    var baseTasks = formatTaskList[config.extends];
    if( !baseTasks ){
      console.warning( `Unable to extend ${config.extends}: does not exist.` );
    } else {
      generateTasks( this, baseTasks.tasks );
      this.inc = this.inc / incDropoff;
    }
  }

  generateTasks( this, config.tasks );

};


exports.FormatTasks = FormatTasks;

Object.keys( taskSources ).map( taskName => {
  var taskSource = taskSources[taskName];
  var tasks = require(taskSource);
  addTasks( taskName, tasks );
});
