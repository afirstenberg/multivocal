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
        "Context/multivocal_permission/properties/intent",
        "Body/result/metadata/intentName"
      ],
      "Template": "Intent.{{IntentName}}"
    },
    "Action": {
      "Path": [
        "Context/multivocal_permission/properties/action",
        "Body/result/action"
      ],
      "Template": "Action.{{ActionName}}"
    },
    "Default": {
      "Template": "Default"
    },
    "Locale": {
      "Path": [
        "Body/originalRequest/data/user/locale"
      ],
      "Default": "und"
    },
    "HandlerNames": [
      "{{Intent}}",
      "{{Action}}",
      "{{Default}}",
      "Default"
    ],
    "Parameters": {
      "Path": [
        "Body/result/parameters"
      ],
      "Default": {}
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
          "Source":     "Body/originalRequest/data/user/profile/givenName"
        },
        {
          "Permission": "DEVICE_PRECISE_LOCATION",
          "Target":     "Session/Location",
          "Source":     "Body/originalRequest/data/device/location/coordinates"
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
          "TemplateCard": "Card"
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
          "Body/originalRequest/data/surface"
        ],
        "Default": []
      },
      "State": {
        "Path": [
          "Context/multivocal_session/parameters/state"
        ],
        "Default": "{}"
      }
    },
    "User": {
      "Feature": {
        "Path": [
          "Body/originalRequest/data/availableSurfaces"
        ],
        "Default": []
      },
      "State": {
        "Path": [
          "Body/originalRequest/data/user/userStorage"
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
    "Ssml": {
      "Template": "{{#Ssml Voice}}{{{Msg}}} {{{Suffix}}}{{/Ssml}}"
    },
    "Txt": {
      "Template": "{{{Msg}}} {{{Suffix}}}"
    },
    "Context": {
      "PathList": [
        "Requirements/Context",
        "Send/Session",
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
