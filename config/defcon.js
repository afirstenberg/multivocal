module.exports = {
  "Local": {
    "und": {
      "Suffix": {
        "Default": [
          {
            "Template": ""
          }
        ]
      },
      "Voice": [
        {
          "Name": "Default"
        }
      ]
    }
  },
  "Setting": {
    "Intent": {
      "Path": [
        "Context/multivocal_permission/parameters/intentName",
        "Body/result/metadata/intentName",
        "Body/queryResult/intent/displayName"
      ],
      "Template": "Intent.{{IntentName}}"
    },
    "Action": {
      "Path": [
        "Context/multivocal_permission/parameters/actionName",
        "Body/result/action",
        "Body/queryResult/action"
      ],
      "Template": "Action.{{ActionName}}"
    },
    "Default": {
      "Template": "Default"
    },
    "Locale": {
      "Path": [
        "Body/originalRequest/data/user/locale",
        "Body/originalDetectIntentRequest/user/locale"
      ],
      "Default": "und"
    },
    "Handler": {
      "Names": [
        "{{Intent}}",
        "{{Action}}",
        "{{Default}}",
        "Default"
      ],
      "Counter": "Handler.{{HandlerName}}"
    },
    "Parameters": {
      "Path": [
        "Body/result/parameters",
        "Body/queryResult/parameters"
      ],
      "Default": {}
    },
    "Contexts": {
      "Path": [
        "Body/result/contexts",
        "Body/queryResult/outputContexts"
      ],
      "Default": {}
    },
    "Option": {
      "Path": [
        "Body/originalRequest/data/inputs[0]/arguments[0]/textValue",
        "Body/originalDetectIntentRequest/inputs[0]/arguments[0]/textValue"
      ],
      "Prefix": "OPTION_"
    },
    "Requirements": {
      "Path": [
        "Config/Local/{{Locale}}/Requirements/{{Intent}}",
        "Config/Local/{{Locale}}/Requirements/{{Action}}",
        "Config/Local/{{Locale}}/Requirements/Default",
        "Config/Local/{{Lang}}/Requirements/{{Intent}}",
        "Config/Local/{{Lang}}/Requirements/{{Action}}",
        "Config/Local/{{Lang}}/Requirements/Default",
        "Config/Local/und/Requirements/{{Intent}}",
        "Config/Local/und/Requirements/{{Action}}",
        "Config/Local/und/Requirements/Default"
      ],
      "PermissionList": [
        {
          "Permission": "NAME",
          "Target":     "User/Name",
          "Source":     [
            "Body/originalRequest/data/user/profile/givenName",
            "Body/originalDetectIntentRequest/user/profile/givenName"
          ]
        },
        {
          "Permission": "DEVICE_PRECISE_LOCATION",
          "Target":     "Session/Location",
          "Source":     [
            "Body/originalRequest/data/device/location/coordinates",
            "Body/originalDetectIntentRequest/device/location/coordinates"
          ]
        }
      ]
    },
    "Response": {
      "Path": [
        "Config/Local/{{Locale}}/Response/{{Outent}}",
        "Config/Local/{{Locale}}/Response/{{Intent}}",
        "Config/Local/{{Locale}}/Response/{{Action}}",
        "Config/Local/{{Locale}}/Response/{{Default}}",
        "Config/Local/{{Lang}}/Response/{{Outent}}",
        "Config/Local/{{Lang}}/Response/{{Intent}}",
        "Config/Local/{{Lang}}/Response/{{Action}}",
        "Config/Local/{{Lang}}/Response/{{Default}}",
        "Config/Local/und/Response/{{Outent}}",
        "Config/Local/und/Response/{{Intent}}",
        "Config/Local/und/Response/{{Action}}",
        "Config/Local/und/Response/{{Default}}"
      ],
      "EnvField": "Response",
      "Base": {
        "TemplateEnvMap": {
          "Template": "Msg",
          "TemplateCard": "Card",
          "TemplateSuggestions": "Suggestions"
        }
      }
    },
    "Suffix": {
      "Path": [
        "Config/Local/{{Locale}}/Suffix/{{Outent}}",
        "Config/Local/{{Locale}}/Suffix/{{Intent}}",
        "Config/Local/{{Locale}}/Suffix/{{Action}}",
        "Config/Local/{{Locale}}/Suffix/{{Default}}",
        "Config/Local/{{Lang}}/Suffix/{{Outent}}",
        "Config/Local/{{Lang}}/Suffix/{{Intent}}",
        "Config/Local/{{Lang}}/Suffix/{{Action}}",
        "Config/Local/{{Lang}}/Suffix/{{Default}}",
        "Config/Local/und/Suffix/{{Outent}}",
        "Config/Local/und/Suffix/{{Intent}}",
        "Config/Local/und/Suffix/{{Action}}",
        "Config/Local/und/Suffix/{{Default}}",
        "DefCon/Local/und/Suffix/Default"
      ],
      "EnvField": "ResponseSuffix",
      "Base": {
        "TemplateEnvMap": {
          "Template": "Suffix"
        }
      }
    },
    "Session": {
      "Feature": {
        "Path": [
          "Body/originalRequest/data/surface",
          "Body/originalDetectIntentRequest/surface"
        ],
        "Default": []
      },
      "State": {
        "Path": [
          "Context/multivocal_session/parameters/state"
        ],
        "Default": "{}"
      },
      "Counter": {
        "Path": [
          'Context/multivocal_session/parameters/counter'
        ],
        "Default": "{}"
      },
      "Consecutive": {
        "Path": [
          'Context/multivocal_session/parameters/consecutive'
        ],
        "Default": "{}"
      }
    },
    "User": {
      "Feature": {
        "Path": [
          "Body/originalRequest/data/availableSurfaces",
          "Body/originalDetectIntentRequest/availableSurfaces"
        ],
        "Default": []
      },
      "State": {
        "Path": [
          "Body/originalRequest/data/user/userStorage",
          "Body/originalDetectIntentRequest/user/userStorage"
        ],
        "Default": "{}"
      }
    },
    "Voice": {
      "Path": [
        "Config/Local/{{Locale}}/Voice",
        "Config/Local/{{Lang}}/Voice",
        "Config/Local/und/Voice",
        "DefCon/Local/und/Voice"
      ]
    },
    "NoSuffixNeeded": {
      "Criteria":{
        "Terms": [
          "{{EndsWith Msg.Ssml '?'}}",
          "{{Response.ShouldClose}}"
        ],
        "Op": "or"
      }
    },
    "Ssml": {
      "Template": "{{#Ssml Voice}}{{{Msg.Ssml}}} {{{Suffix.Ssml}}}{{/Ssml}}",
      "Remember": "{{Msg.Ssml}} {{Suffix.Ssml}}"
    },
    "Txt": {
      "Template": "{{{First Msg.Txt Msg.Ssml}}} {{{First Suffix.Txt Suffix.Ssml}}}"
    },
    "Context": {
      "PathList": [
        "Requirements/Context",
        "Send/Session",
        "Send/Remember",
        "Response/Context",
        "ResponseSuffix/Context"
      ]
    },
    "ShouldClose": {
      "Path": [
        "ShouldClose",
        "Response/ShouldClose",
        "ResponseSuffix/ShouldClose"
      ],
      "Default": false
    }
  }
};
