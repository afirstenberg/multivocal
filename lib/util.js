
const Template = require('./template');

var objPath = function( obj, path ){
  var ret = undefined;
  if( (typeof obj == 'object') && (typeof path == 'string' || Array.isArray(path)) ){
    var pathElements = path;
    if( typeof path == 'string' ){
      pathElements = path.split('/');
    }
    ret = obj;
    for( var co=0; co<pathElements.length && ret; co++ ){
      var name = pathElements[co];
      ret = ret[name];
    }
  }
  return ret;
};
exports.objPath = objPath;


var objPathsDefault = function( obj, paths, def ){
  if( typeof obj !== 'object' || typeof paths === 'undefined' ){
    return def;
  }
  if( !Array.isArray(paths) ){
    paths = [paths];
  }
  var ret = undefined;
  for( var co=0; co<paths.length && (typeof ret == 'undefined'); co++ ){
    var path = paths[co];
    ret = objPath( obj, path );
  }
  if( typeof ret == 'undefined' ){
    ret = def;
  }
  return ret;
};
exports.objPathsDefault = objPathsDefault;

var setObjPath = function( obj, path, val ){
  if( !Array.isArray(path) ){
    path = path.split('/')
  }

  var root = path[0];
  var childPath = path.slice(1);

  var bracketValue = '';
  var bracketIndex = root.indexOf('[');
  if( bracketIndex > 0 ){
    bracketValue = root.substring( bracketIndex );
    root = root.substring( 0, bracketIndex );
  }

  var arraySize = undefined;
  if( bracketValue !== '' ){
    if( !Array.isArray(obj[root]) ){
      obj[root] = [];
    }
    arraySize = obj[root].length;
  }

  if( childPath.length > 0 ){
    var childObj = obj[root];

    if( arraySize !== undefined ){
      if( bracketValue === '[0]' && arraySize > 0 ){
        childObj = childObj[0];
      } else if( bracketValue === '[=]' && arraySize > 0 ){
        childObj = childObj[arraySize-1];
      } else {
        childObj = {};
      }
    }

    if( typeof childObj !== 'object' ){
      childObj = {};
    }
    val = setObjPath( childObj, childPath, val );
  }

  if( arraySize == undefined ){
    obj[root] = val;

  } else {
    if( bracketValue === '[0]' && arraySize > 0 ){
      obj[root][0] = val;
    } else if( bracketValue === '[=]' && arraySize > 0 ){
      obj[root][arraySize-1] = val;
    } else {
      obj[root].push( val );
    }
  }

  return obj;
};
exports.setObjPath = setObjPath;

var incObjPath = function( obj, path ){
  var val = objPathsDefault( obj, path, 0 );
  val++;
  return setObjPath( obj, path, val );
};
exports.incObjPath = incObjPath;

/**
 * Get a value from the Config/Setting object in the environment or,
 * if not set, the DefCon/Setting object (the default configuration).
 * @param env
 * @param settingPaths
 * @param resultEval
 * @returns {undefined}
 */
var setting = function( env, settingPaths, resultEval ){
  if( typeof settingPaths === 'undefined' ){
    return undefined;
  } else if( !Array.isArray( settingPaths ) ){
    settingPaths = [settingPaths];
  }

  if( !resultEval ){
    resultEval = Template.Methods.Identity;
  }

  // Prefix the setting paths with the config and default config setting prefixes
  var configPaths = settingPaths.map( p => `Config/Setting/${p}`);
  var defconPaths = settingPaths.map( p => `DefCon/Setting/${p}`);
  var paths = configPaths.concat( defconPaths );

  // get the value set at these paths
  var result = objPathsDefault( env, paths );
  var ret = Template.eval( result, env, resultEval );
  return ret;
};
exports.setting = setting;

/**
 * Get the Path value from pathOfSetting and get the value from evaluating those paths.
 * If it does not exist, get the Default value from pathOfSetting and return it.
 * @param env
 * @param pathOfSetting
 */
var pathSetting = function( env, pathOfSetting ){
  var settingPath    = `${pathOfSetting}/Path`;
  var settingDefault = `${pathOfSetting}/Default`;

  var paths = setting( env, settingPath, Template.Methods.Array );
  var ret = objPathsDefault( env, paths, undefined );

  if( typeof ret === 'undefined' ){
    ret = objPathsDefault( env, settingDefault );
  }

  return ret;
};
exports.pathSetting = pathSetting;