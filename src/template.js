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

exports.execute = function( template, env ){
  template = cleanTemplate( template );
  return exports.eval( template, env );
};

exports.eval = function( templateStr, env ){
  var template = Handlebars.compile( templateStr );
  var ret = template( env );
  return ret;
};

exports.evalBoolean = function( templateStr, env ){
  var ret = exports.eval( templateStr, env );
  if( !ret || ret === 'false' ){
    ret = false;
  }
  console.log('Template evalBoolean', templateStr, ret);
  return ret;
};

var cleanTemplate = function( template ){
  var ret = template;
  if( Array.isArray(template) ){
    ret = template.join('');
  }
  return ret;
};
