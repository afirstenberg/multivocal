
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

/**
 * Get a value from the Object based on paths defined in the object,
 * default paths if the configuration doesn't provide any paths,
 * or a default value if the value can't be found in the object.
 * @param info
 */
var objConfigPathsDefault = function( info ){
  var obj = info.env || info.obj;

  // Get the paths to use out of the settings
  // or use the default paths that we have coded in.
  var paths = objPathsDefault( obj, info.settingPath, info.settingDefault );

  // Evaluate these paths to fill in any path components with elements from
  // the environment.
  var evalMethod = info.settingEval || Template.Methods.Array;
  paths = Template.eval( paths, obj, evalMethod );

  var ret;
  if( typeof info.valueDefault !== 'undefined' ){
    // Get the value from these paths
    // or use the default value that we have set.
    ret = objPathsDefault( obj, paths, info.valueDefault );

  } else {
    // If we're not looking for a value, then return the evaluated paths.
    ret = paths;
  }

  return ret;
};
exports.objConfigPathsDefault = objConfigPathsDefault;

var val = function( info ){
  var obj = info.env || info.obj;
  if( info.settingPath ){
    return objConfigPathsDefault( info );

  } else if( (info.settingDefault || info.valuePath) && (typeof info.valueDefault !== 'undefined') ){
    return objPathsDefault( obj, (info.settingDefault || info.valuePath), info.valueDefault );

  } else {
    return objPath( obj, (info.settingDefault || info.valuePath || info.path) );
  }
};
exports.val = val;