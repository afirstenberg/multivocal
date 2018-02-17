
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
