
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
  for( var co=0; co<paths.length && !ret; co++ ){
    var path = paths[co];
    ret = objPath( obj, path );
  }
  if( typeof ret == 'undefined' ){
    ret = def;
  }
  return ret;
};
exports.objPathsDefault = objPathsDefault;
