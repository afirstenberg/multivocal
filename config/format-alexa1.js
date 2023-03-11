module.exports = {
  criteria: {
    Terms: [
      "{{Platform.IsAlexa}}",
    ],
    Op: "and"
  },

  tasks: {
    "Body/version": "version",

    // TODO - sessionAttributes

    "Send/ShouldClose": {
      Criteria: "true",
      Target: "response/shouldEndSession",
      Value: "{{Send.ShouldClose}}",
      ValueType: 'boolean'
    },

    "Send": {
      Target: "response/outputSpeech/type",
      Value: "SSML"
    },

    'Send/Ssml': {
      Target: "response/outputSpeech/ssml",
      Value: '{{#Ssml Voice}}{{{Send.Ssml}}}{{/Ssml}}'
    },
  }
}