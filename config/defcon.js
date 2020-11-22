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
        "Context/multivocal_requirements/parameters/intentName",
        "Body/result/metadata/intentName",      // Dialogflow 1
        "Body/queryResult/intent/displayName",  // Dialogflow 2
        "Body/intentInfo/lastMatchedIntent",    // FIXME: Dialogflow 3
        "Body/intent/name"                      // AoG 3 / AB
      ],
      "Template": "Intent.{{IntentName}}"
    },
    "IntentLevel": {
      "Path": [
        "Config/Level/{{Intent}}",
        "Config/Level/Intent.Default",
        "Config/Level/Default",
        "DefCon/Level/Intent.Default"
      ],
      "Default": ""
    },
    "Action": {
      "Path": [
        "Context/multivocal_requirements/parameters/actionName",
        "Body/result/action",        // Dialogflow 1
        "Body/queryResult/action",   // Dialogflow 2
        "Body/fulfillmentInfo/tag",  // Dialogflow 3
        "Body/handler/name"          // AoG 3 / AB
      ],
      "Template": "Action.{{ActionName}}"
    },
    "ActionLevel": {
      "Path": [
        "Config/Level/{{Action}}",
        "Config/Level/Action.Default",
        "Config/Level/Default",
        "DefCon/Level/Action.Default"
      ],
      "Default": ""
    },
    "Node": {
      "Path": [
        "Body/pageInfo/currentPage", // FIXME: Dialogflow 3
        "Body/scene/name"            // AoG 3 / AB
      ],
      "Template": "Node.{{NodeName}}"
    },
    "Default": {
      "Template": "Default"
    },
    "Platform": {
      "RuleCriteria": {
        "IsDialogflow": {
          "Terms":[
            "{{isTruthy Body.originalRequest}}",
            "{{isTruthy Body.originalDetectIntentRequest}}",
            "{{isTruthy Body.detectIntentResponseId}}"
          ],
          "Op": "or"
        },
        "DialogflowVersion":
          "{{#if Platform.IsDialogflow}}"+
            "{{#if (isTruthy Body.originalRequest)}}"+
              "1"+
            "{{else if (isTruthy Body.originalDetectIntentRequest)}}"+
              "2"+
            "{{else}}"+
              "3"+
            "{{/if}}"+
          "{{/if}}",
        "DialogflowIntegration": "{{Val 'Body/originalDetectIntentRequest/source'}}",
        "ActionsSDKVersion": "{{FirstVal 'Req/headers/google-assistant-api-version' 'Req/headers/google-actions-api-version'}}",
        "IsActionsSDK": "{{isTruthy Platform.ActionsSDKVersion}}",
        "IsActionsOnGoogle": {
          "Terms":[
            "{{eq Body.originalRequest.source             'google'}}",
            "{{eq Body.originalDetectIntentRequest.source 'google'}}",
            "{{Platform.IsActionsSDK}}"
          ],
          "Op": "or"
        },
        "ActionsOnGoogleVersion":
          "{{#if (isTruthy Platform.IsActionsSDK)}}{{Platform.ActionsSDKVersion}}"+
          "{{else if (eq Platform.DialogflowVersion '1')}}{{Body.originalRequest.version}}"+
          "{{else}}{{Body.originalDetectIntentRequest.version}}"+
          "{{/if}}"
      }
    },
    "Precondition": {
      "GooglePing":{
        "Path": [
          "Body/originalRequest/data/inputs",
          "Body/originalDetectIntentRequest/payload/inputs"
        ],
        "Default": [],
        "ArgumentName": "is_health_check"
      }
    },
    "Locale": {
      "Path": [
        "Body/originalRequest/data/user/locale",                 // Dialogflow 1
        "Body/originalDetectIntentRequest/payload/user/locale",  // Dialogflow 2
                                                                 // FIXME: Dialogflow 3
        "Body/user/locale"                                       // AoG 3 / AB
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
      "All":{
        "Path": [
          "Body/result/parameters",       // Dialogflow 1
          "Body/queryResult/parameters",  // Dialogflow 2
          "Body/intentInfo/parameters",   // Dialogflow 3
                                          // TODO: Dialogflow 3 form parameters
          "Body/intent/params",           // AoG 3 / AB
          "Body/scene/slots"              // AoG 3 / AB
        ],
        "Default": {}
      },
      "Value": {
        "PathList": [
          "resolved",   // AoG 3 / AB
          "value"       // AoG 3 / AB
        ]
      }
    },
    "Contexts": {
      "Path": [
        "Body/result/contexts",            // Dialogflow 1
        "Body/queryResult/outputContexts", // Dialogflow 2
        "Body/sessionInfo/parameters",     // Dialogflow 3
        "Body/session/params"              // AoG 3 / AB
      ],
      "Default": {}
    },
    "Option": {
      "Path": [
        "Body/originalRequest/data/inputs[0]/arguments[0]/textValue",                // Dialogflow 1
        "Body/originalDetectIntentRequest/payload/inputs[0]/arguments[0]/textValue", // Dialogflow 2
        "Parameter/multivocalOption"      // AoG 3 / AB default
      ],
      "Prefix": "OPTION_",
      "TypeName": "MultivocalOption"      // AoG 3
    },
    "Media": {
      "Status": {
        "Path": [
          "Body/intent/params/MEDIA_STATUS/resolved"           // AoG 3
        ],
        "Inputs": {
          "Path": [
            "Body/originalRequest/data/inputs",                // Dialogflow 1
            "Body/originalDetectIntentRequest/payload/inputs"  // Dialogflow 2
          ]
        }
      },
      "Progress": {
        "Path": [
          "Body/context/media/progress"    // AoG 3
        ]
      },
      "Controls": [
        "PAUSED",
        "STOPPED"
      ]
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
      "Permission": {
        "List": [
          {
            "Permission": "NAME",
            "Target":     "User/Name",
            "Source":     [
              "Body/originalRequest/data/user/profile/givenName",
              "Body/originalDetectIntentRequest/payload/user/profile/givenName"
            ]
          },
          {
            "Permission": "DEVICE_PRECISE_LOCATION",
            "Target":     "Session/Location",
            "Source":     [
              "Body/originalRequest/data/device/location/coordinates",
              "Body/originalDetectIntentRequest/payload/device/location/coordinates"
            ]
          }
        ]
      },
      "SignIn": {
        "Status": {
          "Path": [
            "Context/actions_intent_sign_in/parameters/SIGN_IN/status"
          ]
        },
        "Intent": {
          "intent": "actions.intent.SIGN_IN",
          "inputValueData": {
            "@type": "type.googleapis.com/google.actions.v2.SignInValueSpec",
            "optContext": "{{Msg/Text}}"
          }
        }
      }
    },
    "FlexResponse": {
      "Targets": [
        "Response"
      ],
      "Path": [
        "Config/Local/{{Locale}}/{{_Target}}/{{Outent}}.{{OutentLevel}}",
        "Config/Local/{{Locale}}/{{_Target}}/{{Outent}}",
        "Config/Local/{{Locale}}/{{_Target}}/{{Intent}}.{{IntentLevel}}",
        "Config/Local/{{Locale}}/{{_Target}}/{{Intent}}",
        "Config/Local/{{Locale}}/{{_Target}}/{{Action}}.{{ActionLevel}}",
        "Config/Local/{{Locale}}/{{_Target}}/{{Action}}",
        "Config/Local/{{Locale}}/{{_Target}}/{{Default}}",
        "Config/Local/{{Lang}}/{{_Target}}/{{Outent}}.{{OutentLevel}}",
        "Config/Local/{{Lang}}/{{_Target}}/{{Outent}}",
        "Config/Local/{{Lang}}/{{_Target}}/{{Intent}}.{{IntentLevel}}",
        "Config/Local/{{Lang}}/{{_Target}}/{{Intent}}",
        "Config/Local/{{Lang}}/{{_Target}}/{{Action}}.{{ActionLevel}}",
        "Config/Local/{{Lang}}/{{_Target}}/{{Action}}",
        "Config/Local/{{Lang}}/{{_Target}}/{{Default}}",
        "Config/Local/und/{{_Target}}/{{Outent}}.{{OutentLevel}}",
        "Config/Local/und/{{_Target}}/{{Outent}}",
        "Config/Local/und/{{_Target}}/{{Intent}}.{{IntentLevel}}",
        "Config/Local/und/{{_Target}}/{{Intent}}",
        "Config/Local/und/{{_Target}}/{{Action}}.{{ActionLevel}}",
        "Config/Local/und/{{_Target}}/{{Action}}",
        "Config/Local/und/{{_Target}}/{{Default}}"
      ]
    },
    "Response": {
      "EnvField": "Response",
      "TemplateResponseMap":{
        "Template": "Msg"
      },
      "RawParameterName": "Markdown"
    },
    "Suffix": {
      "Path": [
        "Config/Local/{{Locale}}/Suffix/{{Outent}}.{{OutentLevel}}",
        "Config/Local/{{Locale}}/Suffix/{{Outent}}",
        "Config/Local/{{Locale}}/Suffix/{{Intent}}.{{IntentLevel}}",
        "Config/Local/{{Locale}}/Suffix/{{Intent}}",
        "Config/Local/{{Locale}}/Suffix/{{Action}}.{{ActionLevel}}",
        "Config/Local/{{Locale}}/Suffix/{{Action}}",
        "Config/Local/{{Locale}}/Suffix/{{Default}}",
        "Config/Local/{{Lang}}/Suffix/{{Outent}}.{{OutentLevel}}",
        "Config/Local/{{Lang}}/Suffix/{{Outent}}",
        "Config/Local/{{Lang}}/Suffix/{{Intent}}.{{IntentLevel}}",
        "Config/Local/{{Lang}}/Suffix/{{Intent}}",
        "Config/Local/{{Lang}}/Suffix/{{Action}}.{{ActionLevel}}",
        "Config/Local/{{Lang}}/Suffix/{{Action}}",
        "Config/Local/{{Lang}}/Suffix/{{Default}}",
        "Config/Local/und/Suffix/{{Outent}}.{{OutentLevel}}",
        "Config/Local/und/Suffix/{{Outent}}",
        "Config/Local/und/Suffix/{{Intent}}.{{IntentLevel}}",
        "Config/Local/und/Suffix/{{Intent}}",
        "Config/Local/und/Suffix/{{Action}}.{{ActionLevel}}",
        "Config/Local/und/Suffix/{{Action}}",
        "Config/Local/und/Suffix/{{Default}}",
        "DefCon/Local/und/Suffix/Default"
      ],
      "EnvField": "ResponseSuffix",
      "TemplateResponseMap": {
        "Template": "Suffix"
      },
      "RawParameterName": "Markdown"
    },
    "Session": {
      "Id": {
        "Path": [
          "Body/session/id",           // AoG 3 / AB
          "Body/session",              // Dialogflow 1 and 2
          "Body/sessionInfo/session"   // Dialogflow 3
        ]
      },
      "Feature": {
        "Path": [
          "Body/originalRequest/data/surface",                 // Dialogflow 1
          "Body/originalDetectIntentRequest/payload/surface",  // Dialogflow 2
          "Body/device/capabilities"                           // AoG 3 / AB
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
      },
      "Stack": {
        "Path": [
          'Context/multivocal_session/parameters/stack'
        ],
        "Default": "{}",
        "Size": {
          "NodeName": 5
        }
      },
      "StartTime": {
        "Path": [
          "Context/multivocal_session/parameters/startTime"
        ],
        "Default": 0
      }
    },
    "User": {
      "Id": {
        "Path": [
          "User/State/UserId",
          "Body/originalRequest/data/user/userId",
          "Body/originalDetectIntentRequest/payload/user/userId",
          "Body/originalDetectIntentRequest/payload/data/event/user/name"
        ],
        "State": "User/State/UserId",
        "Template": "google:{{User.State.UserId}}"
      },
      "AccessToken":{
        "Path": [
          "Body/originalRequest/data/user/accessToken",
          "Body/originalDetectIntentRequest/payload/user/accessToken"
        ]
      },
      "Profile":{
        "Path": [
          "Body/originalRequest/data/user/idToken",                       // AoG 2, Dialogflow 1
          "Body/originalDetectIntentRequest/payload/user/idToken",        // AoG 2, Dialogflow 2
          "Body/originalDetectIntentRequest/payload/data/event/user"      // Hangouts, Dialogflow 2
        ]
      },
      "Feature": {
        "Path": [
          "Body/originalRequest/data/availableSurfaces",
          "Body/originalDetectIntentRequest/payload/availableSurfaces"
        ],
        "Default": []
      },
      "State": {
        "Path": [
          "Body/originalRequest/data/user/userStorage",                // Dialogflow 1
          "Body/originalDetectIntentRequest/payload/user/userStorage", // Dialogflow 2
          "Body/user/params"                                           // AoG 3 / AB
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
          "{{EndsWith (join (First Msg.Text Msg.Ssml) ' ') '?'}}",
          "{{Response.ShouldClose}}",
          "{{Response.ShouldRepeat}}"
        ],
        "Op": "or"
      }
    },
    "Send": [
      {
        "Target": "Ssml",
        "Template": "{{{join (First Msg.Ssml Msg.Text) ' '}}} {{{join (First Suffix.Ssml Suffix.Text) ' '}}}"
      },
      {
        "Target": "Text",
        "Template": "{{{join (First Msg.Text Msg.Ssml) ' '}}} {{{join (First Suffix.Text Suffix.Ssml) ' '}}}"
      },
      {
        "Target": "Suggestions",
        "CopyFirst": ["Msg", "Suffix"]
      }
    ],
    "Page":{
      // You must set Setting/Page/Url yourself
      "Data": {
        "Path": ["Msg/Page"]
      },
      "UrlState": {
        "Path": "Session/State/PageUrl"
      },
      "Criteria": "{{Session/Feature/INTERACTIVE_CANVAS}}",
      "IncludeEnvironment": [
        "Intent",
        "Action",
        "Node",
        "Outent",
        "Send/Text",
        "Send/Ssml"
      ],
      "SuppressMic": {
        "Path": ["Msg/SuppressMic"],
        "Default": false
      }
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
    },
    "NextNode": {
      "Path": [
        "NextNode",
        "Response/NextNode",
        "ResponseSuffix/NextNode"
      ]
    },
    "Log": {
      "Level": "info",
      "Modules": "multivocal:*"
    }
  },
  "Level": {
    "Intent.Default": "{{lookup Session.Consecutive Intent}}",
    "Action.Default": "{{lookup Session.Consecutive Action}}"
  }
};
