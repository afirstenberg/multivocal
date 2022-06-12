
const Template = require('./template');
const Response = require('./response');
const Util = require('./util');
const Auth = require('./auth');
const Log = require('./log');
const Timing = require('./timing');

const Config = require('./multivocalConfig');
const Preprocessors = require('./multivocalPreprocessors');
const Builders = require('./multivocalBuilders');
const Requirements = require('./multivocalRequirements');
const Handlers = require('./multivocalHandlers');
const Format = require('./multivocalFormat');
const Postprocessors = require('./multivocalPostprocessors');

/**===================================================================*/

exports.Config = Config.source;
exports.setConfig = Config.setConfig;
exports.addConfig = Config.addConfig;
exports.getConfig = Config.getConfig;

exports.addPrepprocessor = Preprocessors.addPreprocessor;
exports.addBuilder = Builders.addBuilder;

exports.setRequirementRequest = Requirements.set;
exports.getRequirementRequest = Requirements.get;
exports.requestDefault = Requirements.requestDefault;

exports.addHandler = Handlers.addHandler;
exports.addIntentHandler = Handlers.addIntentHandler;
exports.addActionHandler = Handlers.addActionHandler;
exports.handleDefault = Handlers.handleDefault;

exports.addPostprocessor = Postprocessors.addPostprocessor;

/**===================================================================*/

require('./standard').init();

var doprocess = function( env ){

  if( env.Sent || Util.objPath( env, 'Send/Json' ) ){
    return Promise.resolve( env );
  }

  return Timing.begin( env, 'Process' )

    // Build the initial environment
    .then( env => Builders.buildEnv( env ) )

    // See if there are any prerequisites/requirements
    .then( env => Requirements.request( env ) )

    // Determine what handler we should call and call it
    .then( env => Handlers.handle( env ) )

    // Prepare a response if one hasn't already been sent
    .then( env => Format.format( env ) )

    .then( env => Timing.end( env, 'Process' ) )

    .catch( err => {
      console.error( 'Problem during processing', err );
      return Promise.reject( err );
    });
};
exports.process = doprocess;


/**===================================================================*/

var processExpressParameters = function( request, response ){
  var env = {
    Body: request.body,
    Req: request,
    Res: response
  };
  return Promise.resolve( env );
};

var processExpressResponse = function( env ){
  var json = Util.objPath( env, 'Send/Json' );
  if( !env.Sent && json ){
    env.Res.send( json );
    env.Sent = true;
  }
  return Promise.resolve( env );
};

var processExpressWebhook = function( request, response ){
  return processExpressParameters( request, response )
    .then( env => Preprocessors.preprocess( env ) )
    .then( env => doprocess( env ) )
    .then( env => processExpressResponse( env ) )
    .then( env => Postprocessors.postprocess( env ) );
};
exports.processExpressWebhook = processExpressWebhook;
exports.processGCFWebhook     = processExpressWebhook;

const FirebaseFunctions = require('firebase-functions');
var processFirebaseWebhook =
  FirebaseFunctions.https.onRequest( (request, response) => processExpressWebhook( request, response ) );
exports.processFirebaseWebhook = processFirebaseWebhook;

var processLambdaParameters = function( event, context, callback ){
  var env = {
    Body: JSON.parse( event.body ),
    Lambda: {
      Event:    event,
      Context:  context,
      Callback: callback
    }
  };
  return Promise.resolve( env );
};

var processLambdaResponse = function( env ){
  var json = Util.objPath( env, 'Send/Json' );
  if( !env.Sent && json ){
    var response = {
      statusCode: 200,
      headers: {},
      body: JSON.stringify( json )
    };
    env.Lambda.Callback( null, response );
    env.Sent = true;
  }
  return Promise.resolve( env );
};

var processLambdaWebhook = function( event, context, callback ){
  return processLambdaParameters( event, context, callback )
    .then( env => Preprocessors.preprocess( env ) )
    .then( env => doprocess( env ) )
    .then( env => processLambdaResponse( env ) )
    .then( env => Postprocessors.postprocess( env ) );
};
exports.processLambdaWebhook = processLambdaWebhook;
