module.exports = {
  extends: "dialogflow3-base",
  criteria: {
    Terms: [
      "{{eq Platform.DialogflowVersion '3'}}",
      "{{eq Platform.DialogflowIntegration 'dfMessenger'}}"
    ],
    Op: "and"
  },
  tasks: {
    /* Suggestion chips */
    'Send/Suggestions': {
      Criteria: '{{or (and (isArray Msg.Suggestions) (length Msg.Suggestions)) (and (isArray Suffix.Suggestions) (length Suffix.Suggestions))}}',
      Target: 'fulfillmentResponse/messages[+]/payload/richContent[+][+]',
      Value:
        '{{Set "_This/type" "chips"}}'+
        '{{#each Msg.Suggestions}}'+
        '{{#if (length this)}}{{Set "_This/options[+]/text" this}}{{/if}}'+
        '{{/each}}'+
        '{{#each Suffix.Suggestions}}'+
        '{{#if (length this)}}{{Set "_This/options[+]/text" this}}{{/if}}'+
        '{{/each}}'
    }
  }
};