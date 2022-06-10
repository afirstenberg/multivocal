const Util = require( "./util" );
const Template = require( "./template" );

const Config = require( "./multivocalConfig" );

const requesters = {};

function set( requirement, requester ){
  requesters[requirement] = requester;
}
exports.set = set;

function get( requirement ){
  return requesters[requirement];
}
exports.get = get;

function requestRequirementsContext( env, additionalParameters ){
  var parameters = {
    action:     env.Action,
    actionName: env.ActionName,
    intent:     env.Intent,
    intentName: env.IntentName
  };
  if( typeof additionalParameters === 'object' ){
    Object.assign( parameters, additionalParameters );
  }
  var context = {
    name: 'multivocal_requirements',
    lifespan: 1,
    parameters: parameters
  };
  Util.setObjPath( env, 'Requirements/Context', context );
};

/**
 *
 * @param env
 * @param name
 * @param additionalParameters truthy if the multivocal_requirements context should be set
 *        (if an object, it will be added to the parameters)
 * @return {Promise<any>}
 */
function requestDefault( env, name, additionalParameters ){

  if( name ){
    // Save environment information if we expect to use it
    if( additionalParameters ){
      requestRequirementsContext( env, additionalParameters );
    }

    // Change the environment to reflect the request
    var request = `Request.${name}`;
    Util.setObjPath( env, 'Requirements/RequestName', name );
    Util.setObjPath( env, 'Requirements/Request', request );
    Util.setObjPath( env, 'Action',  `${request}.${env.Action}`);
    Util.setObjPath( env, 'Intent',  `${request}.${env.Intent}`);
    Util.setObjPath( env, 'Default', `${request}.${env.Default}`);
  }

  return Promise.resolve( env );
};
exports.requestDefault = requestDefault;

function requestPermission( env ){
  var permissionList = Util.setting( env, 'Requirements/Permission/List' );

  var requirements = Util.objPath( env, 'Requirements/Requested' );
  var permissions;
  if( requirements ){
    var permissionsHash = {};
    permissionList.map( entry => {
      var requirement = entry.Target;
      if( requirements.includes(requirement) ){
        permissionsHash[entry.Permission] = true;
      }
    });
    permissions = Object.keys(permissionsHash).sort();
  }

  if( permissions ){
    var intent = {
      "intent": "actions.intent.PERMISSION",
      "data": {
        "@type": "type.googleapis.com/google.actions.v2.PermissionValueSpec",
        "permissions": permissions
      }
    };
    Util.setObjPath( env, 'Requirements/Intent', intent );
  }

  return requestDefault( env, 'Permission', true );
};
Config.DefCon.get().then( defcon => {
  defcon.Setting.Requirements.Permission.List.map( entry => {
    var target = entry.Target;
    if( target ){
      requesters[target] = requestPermission;
    }
  });
});

function requestSignIn( env ){
  var status = Util.pathSetting( env, 'Requirements/SignIn/Status' );
  var additionalParameters = false;
  if( status ){
    // We aren't authenticated, but we have authentication status info,
    // so we shouldn't ask for it again, but will set the level with this.
    Util.setObjPath( env, 'IntentLevel', status );
    Util.setObjPath( env, 'ActionLevel', status );

  } else {
    // There is no status set, so this is probably first time requesting,
    // so we set the Intent we ask for.
    var intent = Util.setting( env, 'Requirements/SignIn/Intent', Template.evalIdentity );
    Util.setObjPath( env, 'Requirements/Intent', intent );
    additionalParameters  = true;
  }

  return requestDefault( env, 'SignIn', additionalParameters );
};
requesters['User/IsAuthenticated'] = requestSignIn; // FIXME

function request( env ){
  var requirements = Util.pathSetting( env, 'Requirements' );
  if( typeof requirements === 'undefined' ){
    requirements = [];
  }
  if( !Array.isArray(requirements) ){
    requirements = [requirements];
  }
  Util.setObjPath( env, 'Requirements/Requested', requirements );

  // Check our requirements to see if we have everything we need
  var requester;
  for( var co=0; co<requirements.length && !requester; co++ ){
    var requirement = requirements[co];
    var val = Util.objPath( env, requirement );
    if( typeof val === 'undefined' ){
      requester = requesters[requirement];
      if( !requester ){
        console.error('Multivocal requestRequirements no requester for requirement',requirement);
      }
    }
  }

  // If we're missing something, request it
  requester = requester || requestDefault;
  return requester( env )
    .catch( err => {
      console.error( 'Multivocal requestRequirements err', err );
    });
};
exports.request = request;