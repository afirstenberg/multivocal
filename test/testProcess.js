var Multivocal = require( '../lib/multivocal' );
var MultivocalTest = require( './MultivocalTest' );
var Util = require( '../lib/util' );
var deepCopy = require( 'object-assign-deep' );

new Multivocal.Config.Simple({
  Setting: {
    FlexResponse: {
      Targets: [
        "step1",
        "step2",
        "Response"
      ]
    }
  },
  Local: {
    und: {
      step1: {
        Default: [
          {
            Criteria: "true",
            Debug: "step1",
            Template: {
              foo: "bar"
            }
          }
        ]
      },
      step2: {
        Default: [
          {
            Debug: {
              step2: "step2",
              step2a: "whee"
            }
          },
          "charlie",
          "delta"
        ]
      },
      Response: {
        Default: [
          {
            Base: {Ref: "step1Response"},
            Debug: {
              response: "{{step2}}"
            },
            Template: {
              Ssml: "<p>just:</p> <p>{{step2}}</p>"
            }
          },
          "{{step1.foo}} [2s] {{step2}}",
          "{{step1.foo}}&{{step2}}"
        ]
      }
    }
  }
})

var headers = {
  "google-actions-api-version": 3
};
var body = {

};
MultivocalTest.processTest( headers, body ).then( env => processResult(env) );

var processResult = function( env ){
  var e = {};
  var paths = [
    "step1",
    "step1Response",
    "step2",
    "step2Response",
    "Response",
    "Msg",
    "Send/Context/multivocal_debug"
  ];
  paths.forEach( path => Util.setObjPath(e, path, Util.objPath( env, path ) ) );
  /*
  var e = deepCopy.noMutate( null, env );
  delete e.Config;
  delete e.DefCon;
  */
  console.log( JSON.stringify( e, null, 1 ) );
}