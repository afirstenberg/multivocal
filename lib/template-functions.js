
const Handlebars = require('./template').Handlebars;
const Util = require('./Util');

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
  out += openTag( 'voice', voice.Voice );
  out += openTag( 'prosody', voice.Prosody );
  out += options.fn( options.data.root );
  out += closeTag( 'prosody', voice.Prosody );
  out += closeTag( 'voice', voice.Voice );
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