var Handlebars = require('handlebars');
var helpers = require('handlebars-helpers')({
  handlebars: Handlebars
});

var removeAAnHelper = function( text ){
  return text
    .replace( 'a ', '' )
    .replace( 'an ', '' );
};
Handlebars.registerHelper( 'removeAAn', removeAAnHelper );

exports.Handlebars = Handlebars;

var methods = {};

exports.execute = function( templateStr, env ){
  var template = Handlebars.compile( templateStr );
  var ret = template( env );
  return ret;
};

exports.eval = function( template, env, method ){
  if( typeof method === 'string' ){
    method = methods[method];
  }
  if( !method ){
    if( typeof template === 'object' && !Array.isArray(template) ){
      method = exports.evalObj;
    } else {
      method = exports.evalConcatStr;
    }
  }
  return method( template, env );
};

// Don't actually evaluate it. Included for completeness
exports.evalIdentity = function( obj ){
  return obj;
};
methods.Identity = exports.evalIdentity;

exports.evalConcatStr = function( template, env ){
  if( Array.isArray(template) ){
    template = template.join('');
  }
  return exports.execute( template, env );
};
methods.Str = exports.evalConcatStr;

exports.evalBoolean = function( templateStr, env ){
  var ret = exports.execute( templateStr, env );
  if( !ret || ret === 'false' ){
    ret = false;
  }
  console.log('Template evalBoolean', templateStr, ret);
  return ret;
};
methods.Bool = exports.evalBoolean;

/**
 * Evaluate each item in an array as a template
 * @param templates
 * @param env
 * @returns {Array}
 */
exports.evalArray = function( templates, env ){
  if( !Array.isArray( templates ) ){
    templates = [templates];
  }
  var ret = templates.map( template => exports.execute( template, env ) );
  return ret;
};
methods.Array = exports.evalArray;

exports.evalObj = function( templateObj, env ){
  if( typeof templateObj === 'string' ){
    templateObj = JSON.parse( templateObj );

  } else if( Array.isArray( templateObj ) ){
    return exports.evalArray( templateObj, env );
  }

  var ret = {};

  var keys = Object.keys( templateObj );
  keys.map( key => {
    var valTemplate = templateObj[key];
    var val;
    if( typeof valTemplate === 'string' ){
      val = exports.evalConcatStr( valTemplate, env );

    } else if( Array.isArray( valTemplate ) ){
      val = exports.evalArray( valTemplate, env );

    } else if( typeof valTemplate === 'object' ){
      val = exports.evalObj( valTemplate, env );

    } else {
      val = valTemplate;
    }
    ret[key] = val;
  });

  return ret;
};

exports.Methods = methods;