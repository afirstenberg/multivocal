
const Template = require('./template');

var objPath = function( obj, path ){
  var splitRegexp = new RegExp('[\\/\\[]');
  var ret = undefined;
  if( (typeof obj == 'object') && (typeof path == 'string' || Array.isArray(path)) ){
    var pathElements = path;
    if( typeof path == 'string' ){
      pathElements = path.split( splitRegexp );
    }
    ret = obj;
    for( var co=0; co<pathElements.length && ret; co++ ){
      var name = pathElements[co];
      var closebracket = name.indexOf(']');
      if( closebracket > 0 ){
        name = name.substring( 0, closebracket );
        name = Number.parseInt( name, 10 );
        // TODO - what if this isn't a number?
      }
      ret = ret[name];
    }
  }
  return ret;
};
exports.objPath = objPath;

var IsFalsey = {
  "Standard":  val => !val,
  "Undefined": val => typeof val === 'undefined',
  "Empty":     val => val === '',
  "Zero":      val => val === 0,
  "False":     val => val === false,
  "Null":      val => val === null,
  "NaN":       val => Number.isNaN( val ),
  "Never":     val => false
};
exports.IsFalsey = IsFalsey;

var objPathsDefault = function( obj, paths, def, nullTests ){
  // Turn the nullTests into an array
  if( typeof nullTests === 'undefined' ){
    nullTests = [IsFalsey.Undefined];
  } else if( typeof nullTests === 'string' ){
    nullTests = nullTests.split(/[, |&]+/);
  } else if( !Array.isArray(nullTests) ){
    nullTests = [nullTests];
  }

  // Make sure the nullTests array is an array of functions
  var tests = nullTests.map( v => typeof v === 'function' ? v : (IsFalsey[v] || IsFalsey.Never) );
  var isNull = v => tests.map( f => f(v) ).reduce( (acc, v) => acc || v );

  if( typeof obj !== 'object' || typeof paths === 'undefined' ){
    return def;
  }
  if( !Array.isArray(paths) ){
    paths = [paths];
  }
  var ret = undefined;
  for( var co=0; co<paths.length && isNull(ret); co++ ){
    var path = paths[co];
    ret = objPath( obj, path );
  }
  if( isNull(ret) ){
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

  var arrayIndexes = [];
  var bracketIndex = root.indexOf('[');
  if( bracketIndex > 0 ){
    var bracketValue = root.substring( bracketIndex );
    arrayIndexes = bracketValue.split(/[\[\]]+/);
    if( arrayIndexes.length > 2 ){
      arrayIndexes = arrayIndexes.splice( 1, arrayIndexes.length - 2 );
    } else {
      // There are no indices to reference
      arrayIndexes = [];
    }
    root = root.substring( 0, bracketIndex );
  }

  var arraySize = undefined;
  if( arrayIndexes.length ){
    if( !Array.isArray(obj[root]) ){
      obj[root] = [];
    }
  }

  var childObj = obj[root];
  for( var co=0; co<arrayIndexes.length; co++ ){
    // Determine which index in the childObj we're referencing
    var arrayIndex = arrayIndexes[co];
    if( arrayIndex === '=' ){
      arrayIndex = Math.max( childObj.length - 1, 0 );

    } else if( arrayIndex === '+' ){
      arrayIndex = childObj.length;

    } else {
      arrayIndex = Number.parseInt( arrayIndex, 10 );
    }

    // Make sure it exists
    if( typeof childObj[arrayIndex] === 'undefined' ){
      // If we have more indexes to reference, then make sure this is an array,
      // Otherwise, it will either be an object for further referencing,
      // or the value itself.
      if( co === arrayIndexes.length - 1 ){
        // This is the last index, so the next one should be an object
        if( childPath.length > 0 ){
          // We have more references to go
          childObj[arrayIndex] = {};
        } else {
          // this is the end of the line, set the value
          childObj[arrayIndex] = val;
        }
      } else {
        childObj[arrayIndex] = [];
      }
    } else if( (co === arrayIndexes.length - 1) && (childPath.length == 0) ){
      // This is the last item, but it already exists, so set the value
      childObj[arrayIndex] = val;
    }

    // Make it the new childObj
    childObj = childObj[arrayIndex];
  }

  if( childPath.length > 0 ){
    if( typeof childObj === 'undefined' ){
      obj[root] = {};
      childObj = obj[root];
    }
    setObjPath( childObj, childPath, val );
  } else if( arrayIndexes.length === 0 ){
    obj[root] = val;
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

var setObjPathFrom = function( obj, path, valuePath ){
  var val = objPath( obj, valuePath );
  if( typeof val !== 'undefined' ){
    setObjPath( obj, path, val );
  }
  return obj;
};
exports.setObjPathFrom = setObjPathFrom;

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
  var ret;
  var result = objPathsDefault( env, paths );
  if( typeof result !== 'undefined' ){
    ret = Template.eval( result, env, resultEval );
  }
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
  var settingIsFalseyPath  = `${pathOfSetting}/IsFalsey`;
  var settingIsFalsey = setting( env, settingIsFalseyPath );

  var paths = setting( env, settingPath, Template.Methods.Array );
  var ret = objPathsDefault( env, paths, undefined, settingIsFalsey );

  if( typeof ret === 'undefined' ){
    ret = setting( env, settingDefault );
  }

  return ret;
};
exports.pathSetting = pathSetting;

/**
 * Evaluate a list of objects, returning the value of the first criteria that matches.
 * @param env The environment
 * @param criteriaMatchList A list of objects with attributes {Criteria, Value}
 * @param def The default value if there is no match
 * @return The first Value whose Criteria evaluates to true or the default value if nothing matches.
 */
var criteriaMatch = function( env, criteriaMatchList, def ){
  var ret;

  for( var co=0; co<criteriaMatchList.length && !ret; co++ ){
    var criteriaMatch = criteriaMatchList[co];
    if( criteriaMatch ){
      var criteria = criteriaMatch.Criteria;
      var eval = Template.evalBoolean( criteria, env );
      if( eval ){
        ret = criteriaMatch.Value;
      }
    }
  }

  if( !ret ){
    ret = def;
  }

  return ret;
}
exports.criteriaMatch = criteriaMatch;

var criteriaMatchSetting = function( env, pathOfCriteriaMatch ){
  var settingCriteriaMatch = `${pathOfCriteriaMatch}/CriteriaMatch`;
  var criteriaMatchList = setting( env, settingCriteriaMatch );

  var settingDefault       = `${pathOfCriteriaMatch}/Default`;
  var def = setting( env, settingDefault );

  var ret = criteriaMatch( env, criteriaMatchList, def );
  return ret;
}
exports.criteriaMatchSetting = criteriaMatchSetting;

var random = function( size ){
  var ret = Math.floor( Math.random() * size );
  return ret;
};
exports.random = random;

/**
 * Return a shallow copy of the array with the contents shuffled
 * @param arr
 */
var shuffled = function( arr ){
  if( !Array.isArray(arr) ){
    return [arr];
  }
  var ret = arr.slice();
  var size = ret.length;
  for( var co=0; co<size; co++ ){
    var target = random(size);
    var tmp = ret[co];
    ret[co] = ret[target];
    ret[target] = tmp;
  }
  return ret;
};
exports.shuffled = shuffled;