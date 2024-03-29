
const Handlebars = require('./template').Handlebars;
const Util = require('./util');

var nonOptionsArguments = function( args ){
  var ret = Array.from( args ).splice( 0, args.length-1 );
  return ret;
};

var optionArgument = function( args ){
  var ret = Array.from( args ).splice( args.length-1 );
  return ret[0];
};

helper = module.exports;

/**
 *
 * @param text
 * @returns {string|XML}
 */
helper.RemoveAAn = function( text ){
  return text
    .replace( 'a ', '' )
    .replace( 'an ', '' );
};

/**
 * Wrap the contents in SSML tags, including tags that set the voice and prosody
 * values defined.
 * @param voice Definitions of the voice and prosody tags.
 * @param options Provided by Handlebars
 * @returns {string}
 */
helper.Ssml = function( voice, options ){

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
  Util.eachVoiceTag( voice, (tag,attributes) => {
    out += openTag( tag, attributes );
  })
  out += options.fn( options.data.root );
  Util.eachVoiceTag( voice, (tag,attributes) => {
    out += closeTag( tag, attributes );
  })
  out += '</speak>';

  var ret = new Handlebars.SafeString( out );
  return ret;
};

/**
 * Similar to Array.join(), but using rules for the Oxford comma.
 * @param values The array to return joined values for
 * @param sep1 The normal separator for each element (defaults to ", ")
 * @param sep2 The separator before the final element (defaults to "and ")
 * @param options Provided by Handlebars
 * @returns {*}
 */
helper.Oxford = function( values, sep1, sep2, options ){
  if( !Array.isArray( values ) ){
    return values;
  } else if( values.length === 0 ){
    return '';
  } else if( values.length === 1 ){
    return values[0];
  }

  var ret = '';
  if( !options ){
    options = sep2;
    sep2 = 'and ';
  }
  if( !options ){
    options = sep1;
    sep1 = ', ';
  }

  if( values.length === 2 ){
    return values[0]+' '+sep2+values[1];
  }

  for( var co=0; co<values.length-1; co++ ){
    ret += values[co]+sep1;
  }
  ret += sep2;
  ret += values[values.length-1];

  return ret;
};

/**
 * Use the Multivocal path syntax to evaluate the environment
 * @param path The string path to evaluate in the environment
 * @returns {*} What the path evaluates to
 */
helper.Val = function( path, options ){
  var ret = Util.objPath( options.data.root, path );
  return ret;
};

/**
 * Get the first defined value from a list of paths
 * @param paths... An array of paths or the paths expressed in the function arguments
 * @returns {*} The first value defined from the paths
 */
helper.FirstVal = function( paths /*...*/ ){
  var paths = nonOptionsArguments( arguments );
  if( paths.length == 1 ){
    paths = paths[0];
  }
  var options = optionArgument( arguments );
  var ret = Util.objPathsDefault( options.data.root, paths );
  return ret;
};

/**
 * Get the first value defined from a list of values
 * @param values... One or more values
 * @returns {*} The first defined value
 */
helper.First = function( values /*...*/ ){
  var vals = nonOptionsArguments( arguments );
  var ret;
  for( var co=0; co<vals.length && (typeof ret === 'undefined'); co++ ){
    ret = vals[co];
  }
  return ret;
};

/**
 *
 * @param arr An array to use to randomly order
 * @returns {Array} A new array with the elements of arr in a random order
 */
helper.Shuffled = function( arr /*...*/ ){
  var vals = nonOptionsArguments( arguments );
  if( vals.length === 1 && Array.isArray(vals[0]) ){
    vals = vals[0];
  }
  return Util.shuffled( vals );
};

/**
 * Pick (at most) how many elements of an array to return
 * @param howMany How many to return, at the most
 * @param arr The array to pick elements from
 * @param options Provided by Handlebars
 * @returns {Array.<T>}
 */
helper.Pick = function( howMany, arr, options ){
  var s = Util.shuffled( arr );
  var ret = s.slice( 0, howMany );
  return ret;
};

/**
 * Get values from a path in the environment and pick (at most) some elements from it
 * @param howMany How many to return, at the most
 * @param path Where the elements in the array comes from
 * @param options Provided by HAndlebars
 * @returns {Array.<T>}
 */
helper.PickVal = function( howMany, path, options ){
  var arr = Util.objPath( options.data.root, path );
  return helper.Pick( howMany, arr, options );
};

/**
 * Get an array with the keys of an object. (What Object.keys(obj) would return)
 * @param obj The object to get the keys for
 * @param options Provided by Handlebars
 * @returns {Array.<String>}
 */
helper.ObjectKeys = function( obj, options ){
  var keys = Object.keys( obj );
  return keys;
}

/**
 * Get a value, likely an Object, from a path in the environment and return the keys.
 * @param objPath Where in the environment the object should come from
 * @param options Provided by Handlebars
 * @return {*|*[]|Array<String>}
 */
helper.ValKeys = function( objPath, options ){
  var obj = Util.objPath( options.data.root, objPath );
  if( !obj ){
    return [];

  } else if( typeof obj === 'object' && !Array.isArray( obj ) ){
    return helper.ObjectKeys( obj, options  );

  } else if( Array.isArray( obj ) ){
    return obj;

  } else {
    return [ obj ];
  }
}

/**
 * Set a value to a location in the environment.
 * The path may include [+] to add an element to an array at that part of the path
 * or [=] to reference the last element of an array at that part of the path.
 * @param path The path to the location to set.
 * @param val The value to set. If undefined, the value is determined from the block.
 * @param options Provided by Handlebars
 * @returns {*} The value
 */
helper.Set = function( path, val, options ){
  if( typeof options === 'undefined' ){
    options = val;
    val = options.fn( this );
  }
  Util.setObjPath( options.data.root, path, val );
  return val;
};

helper.EndsWith = function( val, suffix ){
  return val && val.endsWith( suffix );
};

/**
 * Get the setting from the configuration or default configuration
 * @param paths
 * @param resultEval
 * @param options
 * @returns {*|undefined}
 */
helper.Setting = function( paths, resultEval, options ){
  if( typeof options === 'undefined' ){
    options = resultEval;
    resultEval = undefined;
  }
  return Util.setting( options.data.root, paths, resultEval );
};