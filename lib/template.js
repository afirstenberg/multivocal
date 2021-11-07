var Handlebars = require('handlebars');
var helpers = require('handlebars-helpers')({
  handlebars: Handlebars
});

exports.Handlebars = Handlebars;

var config = {
  allowProtoPropertiesByDefault: true
};
exports.config = config;

exports.setConfig = function( newConfig ){
  config = newConfig;
  return config;
}

// Load our own Handlebars functions
var funcs = require('./template-functions');
var fkeys = Object.keys( funcs );
fkeys.map( fname => {
  var func = funcs[fname];
  Handlebars.registerHelper( fname, func );
});

var methods = {};

exports.execute = function( templateStr, env ){
  var template = Handlebars.compile( templateStr );
  env['_This'] = undefined;
  var ret = template( env, config );
  if( env['_This'] ){
    ret = env['_This'];
  }
  return ret;
};

exports.eval = function( template, env, method ){
  if( typeof method === 'string' ){
    method = methods[method];
  }
  if( !method ){
    if( typeof template === 'boolean' || typeof template === 'number' ){
      return template;
    } else if( typeof template === 'object' && !Array.isArray(template) ){
      method = exports.evalObj;
    } else if( Array.isArray(template) ){
      method = exports.evalArray;
    } else {
      method = exports.evalConcatStr;
    }
  }

  var oldTemplateResult = env['_Result'];
  env['_Result'] = undefined;
  var ret = method( template, env );
  env['_Result'] = oldTemplateResult;
  return ret;
};
methods.Typed = exports.eval;

// Don't actually evaluate it. Included for completeness
exports.evalIdentity = function( obj ){
  return obj;
};
methods.Identity = exports.evalIdentity;

exports.evalConcatStr = function( template, env ){
  if( Array.isArray(template) ){
    template = template.join('');
  }
  if( typeof template === 'number' ){
    return template;
  }
  return exports.execute( template, env );
};
methods.Str = exports.evalConcatStr;

exports.evalBoolean = function( template, env ){
  var ret;
  if( Array.isArray( template ) ){
    template = {
      Terms: template,
      Op: 'and'
    };
  }
  if( typeof template === 'string' ){
    template = {
      Terms: [template],
      Op: 'and'
    };
  }

  if( template.Terms.length === 1 ){
    ret = exports.execute( template.Terms[0], env );
    if( !ret || ret === 'false' ){
      ret = false;
    }

  } else {
    var left = {
      Terms: [template.Terms[0]],
      Op: template.Op
    };
    var right = {
      Terms: template.Terms.slice(1),
      Op: template.Op
    };
    ret = exports.evalBoolean( left, env );
    if( template.Op === 'or' ){
      ret = ret || exports.evalBoolean( right, env );
    } else {
      ret = ret && exports.evalBoolean( right, env );
    }
  }

  //console.log('Template evalBoolean', template, ret);
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
  var ret = templates.map( template => exports.eval( template, env ) );
  return ret;
};
methods.Array = exports.evalArray;

exports.evalObj = function( templateObj, env ){
  if( typeof templateObj === 'string' ){
    templateObj = JSON.parse( templateObj );

  } else if( Array.isArray( templateObj ) ){
    return exports.evalArray( templateObj, env );

  } else if( templateObj && templateObj.CriteriaMatch ){
    return exports.evalObjCriteria( templateObj, env );
  }

  var ret = {};
  if( typeof env['_Result'] == 'undefined' ){
    env['_Result'] = ret;
  }

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

exports.evalObjCriteria = function( criteriaObj, env ){
  var ret;

  if( !criteriaObj || !criteriaObj.CriteriaMatch ){
    return "";
  }

  var criteriaMatchList = criteriaObj.CriteriaMatch;

  for( var co=0; co<criteriaMatchList.length && !ret; co++ ){
    var criteriaMatch = criteriaMatchList[co];
    if( criteriaMatch ){
      var criteria = criteriaMatch.Criteria;
      var eval = exports.evalBoolean( criteria, env );
      if( eval ){
        ret = exports.eval( criteriaMatch.Value, env );
      }
    }
  }

  if( !ret ){
    ret = criteriaObj.Default;
  }

  return ret;
}

exports.Methods = methods;