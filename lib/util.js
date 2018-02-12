
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
  if( typeof paths === 'undefined' ){
    evalMethod = Template.Methods.Identity;
  }
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