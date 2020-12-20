/*
 * DEPRECATED in favor of using the Levels defined below
 */
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

/*
 * DEPRECATED in favor of using the built-in defined Levels
 */
var baselibUnknown = {
  First: {
    Base: {Set: true},
    Criteria: "{{eq (Val 'Session/Consecutive/Action.multivocal.unknown') 1}}"
  },

  Repeat: {
    Base: {Set: true},
    Criteria: [
      "{{gt (Val 'Session/Consecutive/Action.multivocal.unknown') 1}}",
      "{{lt (Val 'Session/Consecutive/Action.multivocal.unknown') 3}}"
    ]
  },

  Final: {
    Base: {Set: true},
    Criteria: "{{gte (Val 'Session/Consecutive/Action.multivocal.unknown') 3}}",
    ShouldClose: true
  }
};

var baselibAbout = {
  HasVersion: {
    Base: {Set: true},
    Criteria: "{{Config/Package/version}}"
  },
  NoVersion: {
    Base: {Set:true},
    Criteria: "{{not Config/Package/version}}"
  }
};

var baselib = {
  Welcome: baselibWelcome, // Deprecated
  About:   baselibAbout,
  Unknown: baselibUnknown  // Deprecated
};

var undWelcomeFirst = [
  "Welcome! What would you like to do?"
];

var undWelcome = [
  "Welcome back! What would you like to do?"
];

var undAbout = [
  {Base:{Ref: "Config/BaseLib/About/HasVersion"}},
  "This is {{Config/Package/name}} version {{Config/Package/version}}.",

  {Base:{Ref: "Config/BaseLib/About/NoVersion"}},
  "I'm just this great voice agent.",
  "There isn't much to say."
];

var undUnknownFirst = [
  "I'm sorry, I didn't get that."
];

var undUnknownSecond = [
  "I'm sorry, but I'm not sure I understand."
];

var undUnknown = [
  {
    Base: {Set:true},
    ShouldClose: true
  },
  "I still didn't understand. Perhaps another time."
];

var undRepeat = [
  "I said:"
];

var undQuit = [
  "Thanks for visiting! Hope to see you again."
];

var undDefault = [
  "Oh dear! I seem to be very confused."
];

module.exports = {
  Meta: {
    Name: 'Standard'
  },
  BaseLib: baselib,
  Local: {
    und: {
      Response: {
        "Action.multivocal.welcome.1": undWelcomeFirst,
        "Action.multivocal.welcome":   undWelcome,
        "Action.multivocal.about":     undAbout,
        "Action.multivocal.unknown.1": undUnknownFirst,
        "Action.multivocal.unknown.2": undUnknownSecond,
        "Action.multivocal.unknown":   undUnknown,
        "Action.multivocal.repeat":    undRepeat,
        "Action.multivocal.quit":      undQuit,
        "Default":                     undDefault
      }
    }
  },
  Setting:{
    Requirements: {
      "Auth": {
        "https://accounts.google.com": {
          "KeysUrl": "https://www.googleapis.com/oauth2/v3/certs",
          "aud": "SET THIS TO YOUR CLIENT ID"
        }
      }
    },
    Precondition: {
      Verify: {
        Rules: {
          AoG3: {
            "Auth": {
              "https://accounts.google.com": {
                "KeysUrl": "https://www.googleapis.com/oauth2/v3/certs",
                "aud": ["SET THIS TO YOUR CLIENT ID"]
              }
            }
          }
        }
      }
    }
  },
  Level: {
    "Action.multivocal.welcome": [
      "{{eq User.State.NumVisits 1}}",
      "{{lt User.State.NumVisits 5}}"
    ]
  }
};