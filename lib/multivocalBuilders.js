
const Util = require( "./util" );
const Template = require( "./template" );
const {v4: uuid} = require( "uuid" );
const Auth = require( "./auth" );
const Timing = require( "./timing" );
const {NamedFunctionSequence} = require( "./namedSequence" );

const builders = new NamedFunctionSequence({
  Timing: 'BuildEnv'
});

function addBuilder( func ){
  builders.add( func );
};
exports.addBuilder = addBuilder;

function Hostname( env ){
  env.Hostname = Util.setting( env, 'Hostname/Template', Template.Methods.Str );
  return Promise.resolve( env );
}
addBuilder( Hostname )

function Locale( env ){
  var locale = Util.pathSetting( env, 'Locale' );
  var dashIndex = locale.indexOf('-');
  var lang = 'und';
  if( dashIndex > 0 ){
    lang = locale.substring( 0, dashIndex );
    var country = locale.substring( dashIndex+1 );
    locale = lang+'-'+country.toUpperCase();
  }
  env.Locale = locale;
  env.Lang = lang;
  return Promise.resolve( env );
};
addBuilder( Locale )

function Parameters( env ){
  env.ParameterInfo = Util.pathSetting( env, 'Parameters/All' );

  env.Parameter = {};
  Object.keys( env.ParameterInfo ).forEach( param => {
    var val = env.ParameterInfo[param];
    if( typeof val === 'object' ){
      var valuePaths = Util.setting( env, 'Parameters/Value/PathList' );  // We need the list, not the value
      val = Util.objPathsDefault( val, valuePaths );
    }
    if( val ){
      env.Parameter[param] = val;
    }
  });

  return Promise.resolve( env );
};
addBuilder( Parameters )

function Contexts( env ){
  env.Context = {};

  // Load any contexts into a more useful environment attribute
  var contexts = Util.pathSetting( env, 'Contexts' );

  if( Array.isArray(contexts) ){
    // Dialogflow format
    for( var co=0; co<contexts.length; co++ ){
      var context = contexts[co];
      var contextName = context.name;
      var lastSlash = contextName.lastIndexOf( '/' );
      contextName = contextName.substr( lastSlash+1 );
      env.Context[contextName] = context;
    }

  } else if( typeof contexts === 'object' ) {
    // AoG 3 / AB format
    var keys = Object.keys( contexts );
    keys.forEach( key => {
      var context = {
        name: key,
        parameters: contexts[key]
      };
      env.Context[key] = context;
    });
  }

  return Promise.resolve( env );
};
addBuilder( Contexts )

var buildEnvStatePath = function( env, path ){
  var val = Util.pathSetting( env, path );
  if( typeof val === 'string' ){
    val = JSON.parse( val );
  }
  Util.setObjPath( env, path, val );
};

function State( env ){

  // FIXME - this should be a PathList setting
  var settingsPathList = [
    'User/State',
    'Session/State',
    'Session/Counter',
    'Session/Consecutive',
    'Session/Stack'
  ];
  settingsPathList.map( path => buildEnvStatePath( env, path ) );

  // Get the session start time, or set it to now
  var sessionStart = Util.pathSetting( env, 'Session/StartTime' );
  if( !sessionStart ){
    sessionStart = Date.now();
  }
  Util.setObjPath( env, 'Session/StartTime', sessionStart );

  return Promise.resolve( env );
};
addBuilder( State )

function Option( env ){
  var optionValue = Util.pathSetting( env, 'Option' );
  var optionPrefix = Util.setting( env, 'Option/Prefix' );
  if( optionValue && optionValue.startsWith( optionPrefix ) ){
    optionValue = optionValue.substring( optionPrefix.length );
    optionValue = parseInt( optionValue, 10 );
  }

  Util.setObjPath( env, "Option", optionValue );
  return Promise.resolve( env );
};
addBuilder( Option )

function Permissions( env ){
  var permissionList = Util.setting( env, 'Requirements/Permission/List' );

  permissionList.map( entry => {
    var val = Util.objPath( env, entry.Source );
    if( typeof val !== 'undefined' ){
      Util.setObjPath( env, entry.Target, val );
    }
  });

  return Promise.resolve( env );
};
addBuilder( Permissions )

function UserId( env ){
  // Set the anonymous user ID
  var idNativeValue = Util.pathSetting( env, 'User/Id' );
  if( !idNativeValue ){
    idNativeValue = uuid();
  }
  var statePath = Util.setting( env, 'User/Id/State' );
  Util.setObjPath( env, statePath, idNativeValue );

  var idTemplate = Util.setting( env, 'User/Id/Template' );
  var idValue = Template.eval( idTemplate, env );
  Util.setObjPath( env, 'User/Id', idValue );

  return Promise.resolve( env );
}
addBuilder( UserId )

function UserAccessToken( env ){
  var accessToken = Util.pathSetting( env, 'User/AccessToken' );

  // No access token. Skip it
  if( !accessToken ){
    return Promise.resolve( env );
  }

  Util.setObjPath( env, 'User/AccessToken', accessToken );
  Util.setObjPath( env, 'User/IsAuthenticated', true );

  return Promise.resolve( env );
}
addBuilder( UserAccessToken )

var buildEnvAuthProfileIdentity = function( env ){
  var profileToken = Util.objPath( env, 'User/IdentityToken' );

  // If we have an identity token, validate it
  var sources = Util.setting( env, 'Requirements/Auth' );
  Auth.addSources( env, sources );

  return Auth.verify( profileToken )

    // If it has validated, then save the profile
    .then( profile => {
      //console.log('buildEnvAuthIdentity profile', profile);
      Util.setObjPath( env, 'User/Profile', profile );
      Util.setObjPath( env, 'User/IsAuthenticated', true );
      return Promise.resolve( env );
    })

    // Log the error, but return as normal
    .catch( err => {
      console.error('Unable to verify token', profileToken, err);
      return Promise.resolve( env );
    })
};

var buildEnvAuthProfileNormalize = function( env ){
  if( Util.objPath( env, 'Platform/DialogflowIntegration' ) === 'hangouts' ){
    Util.setObjPath( env, 'User/IsAuthenticated', true );

    // TODO - All of this should really be derived from settings or something
    var sub = Util.objPathsDefault( env, 'User/ProfileOrig/name', '' );
    sub = sub.substring( 'users/'.length );
    Util.setObjPath( env, 'User/Profile', {sub} );
    Util.setObjPathFrom( env, 'User/Profile/name',    'User/ProfileOrig/displayName' );
    Util.setObjPathFrom( env, 'User/Profile/email',   'User/ProfileOrig/email' );
    Util.setObjPathFrom( env, 'User/Profile/picture', 'User/ProfileOrig/avatarUrl' );

  } else {
    // Can't normalize it
    Util.setObjPathFrom( env, 'User/Profile', 'User/Profile/Orig' );
  }

  console.log('buildEnvAuthProfileNormalize',env.User.Profile);

  return Promise.resolve( env );
};

function UserProfile( env ){
  var profileToken = Util.pathSetting( env, 'User/Profile' );
  console.log('buildEnvAuthProfile profileToken',profileToken);

  // No identity token. Skip it
  if( !profileToken ){
    return Promise.resolve( env );

  } else if( typeof profileToken === 'string' ){
    Util.setObjPath( env, 'User/IdentityToken', profileToken );
    return buildEnvAuthProfileIdentity( env );

  } else {
    Util.setObjPath( env, 'User/ProfileOrig', profileToken );
    return buildEnvAuthProfileNormalize( env );
  }

}
addBuilder( UserProfile )

var buildEnvFeatureGroup = function( env, destinationPath, arrayMod ){
  var surfaces = Util.pathSetting( env, destinationPath );
  if( !Array.isArray(surfaces) ){
    surfaces = [surfaces];
  }
  surfaces.map( surface => {
    var capabilities = surface.capabilities || [surface];
    var val = true; // I assume the surface will have a name someday, put it here
    capabilities.map( capability => {
      var name = capability.name || capability;
      var dot = name.lastIndexOf( '.' )+1;
      name = name.substring( dot );
      Util.setObjPath( env, `${destinationPath}/${name}${arrayMod}`, val );
    });
  });
};

function Features( env ){
  buildEnvFeatureGroup( env, 'Session/Feature', '' );
  buildEnvFeatureGroup( env, 'User/Feature', '[+]' );

  return Promise.resolve( env );
};
addBuilder( Features )

function Media( env ){

  let mediaStatus = Util.setting( env, 'Media/Status' );

  if( !mediaStatus ){
    // It wasn't at a normal path, try checking arrays where we have to get the name
    var inputs = Util.pathSetting( env, 'Media/Status/Inputs' );
    //console.log('buildEnvMedia inputs', inputs);
    for( var ico = 0; inputs && ico<inputs.length; ico++ ){
      var input = inputs[ico];
      var arguments = input.arguments;
      for( var aco=0; arguments && aco<arguments.length; aco++ ){
        var argument = arguments[aco];
        if( argument.name === 'MEDIA_STATUS' ){
          var status = argument.extension.status;
          Util.setObjPath( env, 'MediaStatus', status );
        }
      }
    }
  }

  if( mediaStatus ){
    Util.setObjPath( env, 'MediaStatus', status );
  }

  const mediaProgress = Util.pathSetting( env, 'Media/Progress' );
  Util.setObjPath( env, 'MediaProgress', mediaProgress );

  return Promise.resolve( env );
};
addBuilder( Media )

async function Intent( env ){
  env.IntentName = Util.pathSetting( env, 'Intent' );
  env.Intent = Util.setting( env, 'Intent/Template', Template.Methods.Str );
  return env;
}
addBuilder( Intent )

async function Node( env ){
  env.NodeName = Util.pathSetting( env, 'Node' );
  env.Node = Util.setting( env, 'Node/Template', Template.Methods.Str );
  return env;
}
addBuilder( Node );

async function Action( env ){
  env.ActionName = Util.pathSetting( env, 'Action' );
  env.Action = Util.setting( env, 'Action/Template', Template.Methods.Str );
  return env;
}
addBuilder( Action );

async function Default( env ){
  env.Default = Util.setting( env, 'Default/Template', Template.Methods.Str );
  return env;
}
addBuilder( Default )

async function Voice( env ){
  var sessionData = env.Session.State;

  // We must load the voices first, since picking one may require this
  var voices = Util.pathSetting( env, 'Voice/Voices' );
  env.Voices = voices;

  var voiceName = Util.pathSetting( env, 'Voice/Name' );
  var voice = voices[voiceName];
  console.log('loadVoice', {voices,voiceName,voice});

  voice.Name = voiceName;

  env.Voice  = voice;
  env.VoiceName = voiceName;
  env.Session.State.Voice = voiceName;

  return Promise.resolve( env );
};
addBuilder( Voice )
exports.loadVoice = Voice;


function buildEnv( env ){
  return builders.exec( env );
}
exports.buildEnv = buildEnv;