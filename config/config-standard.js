

var baselibWelcome = {
  First: {
    Base: {Set: true},
    Criteria: "{{eq User.State.NumVisits 1}}"
  },

  Returning: {
    Base: {Set: true},
    Criteria: "{{gt User.State.NumVisits 1}}"
  }
};

var baselibUnknown = {
  First: {
    Base: {Set: true},
    Criteria: "{{eq (Val 'Session/Consecutive/Action.input.unknown') 1}}"
  },

  Repeat: {
    Base: {Set: true},
    Criteria: [
      "{{gt (Val 'Session/Consecutive/Action.input.unknown') 1}}",
      "{{lt (Val 'Session/Consecutive/Action.input.unknown') 3}}"
    ]
  },

  Final: {
    Base: {Set: true},
    Criteria: "{{gte (Val 'Session/Consecutive/Action.input.unknown') 3}}",
    ShouldClose: true
  }
};

var baselib = {
  Welcome: baselibWelcome,
  Unknown: baselibUnknown
};

module.exports = {
  BaseLib: baselib
};