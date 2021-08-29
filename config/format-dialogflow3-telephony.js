module.exports = {
  extends: "dialogflow3-base",
  criteria: {
    Terms: [
      "{{eq Platform.DialogflowVersion '3'}}",
      "{{eq Platform.DialogflowIntegration 'telephony'}}"
    ],
    Op: "and"
  },
  tasks: {
    "Msg/Ssml": {
      After: "Send/NextNode",
      Target: "fulfillmentResponse/messages[+]/outputAudioText/ssml",
      Value: "<speak>{{{Msg/Ssml}}}</speak>"
    },
    "Msg/Ssml/playback": {
      Criteria: "{{isTruthy Msg.Ssml}}",
      Target: "fulfillmentResponse/messages[=]/outputAudioText/allowPlaybackInterruption",
      Value: true
    },
    "Suffix/Ssml": {
      Target: "fulfillmentResponse/messages[+]/outputAudioText/ssml",
      Value: "<speak>{{{Suffix/Ssml}}}</speak>"
    },
    "Suffix/Ssml/playback": {
      Criteria: "{{isTruthy Suffix.Ssml}}",
      Target: "fulfillmentResponse/messages[=]/outputAudioText/allowPlaybackInterruption",
      Value: true
    }
  }
};