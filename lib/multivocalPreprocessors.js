const Util = require( "./util" );
const Timing = require( "./timing" );
const Auth = require( "./auth" );
const Template = require( "./template" );
const {NamedFunctionSequence} = require( "./namedSequence" );

const Config = require('./multivocalConfig')
const Format = require('./multivocalFormat')

class PreprocessorSequence extends NamedFunctionSequence {
  constructor( config ){
    super( config );
  }

  async execTimedFunction( env, item, fn ){
    return env.Preprocess.Fail
      ? env
      : super.execTimedFunction( env, item, fn );
  }
}

const preprocessors = new PreprocessorSequence({
  Timing: 'Preprocess'
})

var addPreprocessor = function( func ){
  preprocessors.add( func );
};
exports.addPreprocessor = addPreprocessor;

var buildEnvPlatform = function( env ){
  return Timing.begin( env, 'Platform' )
    .then( env => {
      var rules = Util.setting( env, 'Platform/RuleCriteria' );
      Object.keys( rules ).forEach( ruleName => {
        //Timing.begin( env, `Platform ${ruleName}` );
        var rule = rules[ruleName];
        var val;
        if( ruleName.startsWith('is') || ruleName.startsWith('Is') ){
          val = Template.evalBoolean( rule, env );
        } else {
          val = Template.eval( rule, env );
        }
        Util.setObjPath( env, `Platform/${ruleName}`, val );
        //Timing.end( env, `Platform ${ruleName}` );
      });

      console.log( 'Multivocal buildEnvPlatform', env.Platform );
      return Promise.resolve( env );
    })
    .then( env => Timing.end( env, 'Platform' ) );
};

var loadConfig = function( env ){
  return Timing.begin( env, 'Config' )
    .then( () => Config.Config.get() )
    .then( config =>{
      env.Config = config;
      return Config.DefCon.get();
    })
    .then( defcon => {
      env.DefCon = defcon;
      return Timing.end( env, 'Config' );
    });
};

var preprocessDialogflowPing = function( env ){
  var isPing = false;

  var inputs = Util.pathSetting( env, 'Precondition/DialogflowPing');
  var argumentName = Util.setting( env, 'Precondition/DialogflowPing/ArgumentName' );
  for( var co=0; inputs && co<inputs.length && !isPing; co++ ){
    var input = inputs[co];
    var arguments = input.arguments || [];
    for( var c1=0; c1<arguments.length && !isPing; c1++ ){
      var argument = arguments[c1];
      var name = argument.name;
      var boolValue = argument.boolValue;
      if( name === argumentName ){
        isPing = boolValue;
      }
    }
  }

  if( isPing ){
    env.Preprocess = {
      Fail: true,
      Msg: {
        Text: "pong"
      }
    };
  }
  return Promise.resolve( env );
};
addPreprocessor( preprocessDialogflowPing );

var preprocessGooglePing = function( env ){
  var isPing = false;

  var value = Util.pathSetting( env, 'Precondition/GooglePing' );
  var expectedValue = Util.setting( env, 'Precondition/GooglePing/ExceptedValue' );
  isPing = (value && expectedValue && expectedValue === value);

  if( isPing ){
    env.Preprocess = {
      Fail: true,
      Msg: {
        Text: "Pong"
      }
    };
  }
  return Promise.resolve( env );
}
addPreprocessor( preprocessGooglePing );

var preprocessVerifyRequestJWT = function( ruleName, env ){

  return Timing.begin( env, `Verify ${ruleName}` )
    .then( env => {
      var ruleBase = `Precondition/Verify/Rules/${ruleName}`;
      var token = Util.pathSetting( env, ruleBase );

      var sources = Util.setting( env, `${ruleBase}/Auth` );
      Auth.addSources( env, sources );

      return Auth.verify( token, env )

        // If we get something back, then it resolved ok
        .then( () => Promise.resolve( true ) )

        // If it didn't resolve, suppress the error, but return false
        .catch( err => {
          console.error('Unable to verify request JWT', token, err);
          return Promise.resolve( false );
        })
    })
    .then( ret => {
      return Timing.end( env, `Verify ${ruleName}` )
        .then( env => ret );
    })
}

var preprocessVerifyRequestRule = function( ruleName, env ){
  var ruleBase = `Precondition/Verify/Rules/${ruleName}`;
  var criteria = Util.setting( env, `${ruleBase}/Criteria` );
  var shouldEvaluate = Template.evalBoolean( criteria, env );
  if( shouldEvaluate ){
    var processor = Util.setting( env, `${ruleBase}/Processor` );
    switch( processor ){
      case 'SimpleProcessor': return Promise.resolve( true );
      case 'JWTProcessor':    return preprocessVerifyRequestJWT( ruleName, env );
    }
  }
  return Promise.resolve( false );
}

var preprocessVerifyRequest = function( env ){

  return Timing.begin( env, "Verify" )
    .then( env => {
      var rules = Util.setting( env, 'Precondition/Verify/Rules' ) || {};
      var ruleNames = Object.keys( rules );
      var verifierPromises = ruleNames.map( ruleName => preprocessVerifyRequestRule( ruleName, env ) );
      return Promise.all( verifierPromises );
    })
    .then( results => {

      var isValid = results.reduce( (ret, result) => ret || result );

      if( !isValid ){
        env.Preprocess = {
          Fail: true,
          Msg: {
            Text: "Failed validation."
          }
        }
      }

      return Timing.end( env, "Verify" );
    });
}
addPreprocessor( preprocessVerifyRequest );

var preprocessFormat = function( env ){
  if( !env.Preprocess.Fail ){
    return Promise.resolve( env );
  }

  env.Msg = env.Preprocess.Msg || {Text:"preprocess fail"};

  return Format.message( env )
    .then( env => Format.json( env ) );
};

var preprocess = function( env ){
  env.Preprocess = {
  };
  return Timing.begin( env, 'Multivocal' )
    .then( env => Timing.begin( env, 'Preprocess' ) )
    .then( env => loadConfig( env ) )
    .then( env => buildEnvPlatform( env ) )
    .then( env => preprocessors.exec( env ) )
    .then( env => preprocessFormat( env ) )
    .then( env => Timing.end( env, 'Preprocess' ) );
};
exports.preprocess = preprocess;
