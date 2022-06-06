const Util = require( "./util" );

var timing = function( env, tag, label ){
  Util.setObjPath( env, `Timing/Tag/${tag}/${label}`, Date.now() );
  return Promise.resolve( env );
};

var timingBegin = function( env, tag ){
  Util.incObjPath( env, 'Timing/CurrentLevel' );
  Util.incObjPath( env, 'Timing/CurrentOrder' );
  Util.setObjPathFrom( env, `Timing/Tag/${tag}/Level`, 'Timing/CurrentLevel' );
  Util.setObjPathFrom( env, `Timing/Tag/${tag}/Order`, 'Timing/CurrentOrder' );
  return timing( env, tag, 'Begin' );
};
var timingStart = timingBegin;
exports.timingBegin = timingBegin;
exports.timingStart = timingBegin;
exports.begin = timingBegin;
exports.start = timingBegin;

var timingEnd = function( env, tag ){
  Util.incObjPath( env, 'Timing/CurrentLevel', -1 );
  return timing( env, tag, 'End' );
};
var timingStop = timingEnd;
exports.timingEnd  = timingEnd;
exports.timingStop = timingEnd;
exports.end = timingEnd;
exports.stop = timingEnd;

var timingBlocks = function( env ){
  let timing = Util.objPathsDefault( env, 'Timing/Tag', [] );
  let keys = Object.keys( timing );
  let blocks = keys.map( key => {
    let val = timing[key];
    let diff = (val.End ? val.End : Date.now()) - val.Begin;
    return Object.assign({
      Label: key,
      Diff: diff
    }, val);
  });
  Util.setObjPath( env, 'Timing/Blocks', blocks );
  return Promise.resolve( env );
};
exports.timingBlocks = timingBlocks;