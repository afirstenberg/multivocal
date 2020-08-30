module.exports = {
  criteria: {
    Terms: [
      "{{eq Platform.DialogflowVersion '3'}}"
    ],
    Op: "and"
  },
  tasks: {
    'Platform/IsDialogflow':{
      TargetEnv: 'Send/Data',
      Value: ''
    },

    'Send/ContextList': {
      Target: 'session_info/parameters',
      Value:
        '{{#each Send.ContextList}}'+
        '{{#Set "_Tmp"}}_This/{{this.name}}{{/Set}}'+
        '{{Set  @root._Tmp this.parameters}}'+
        '{{/each}}'
    },

    /* TODO: transitions to transition/target_page or transition/target_flow
    'NextScene': 'scene/next/name',
    */

    /* TODO: Should close?
    'Send/ShouldClose': {
      Target: '{{Send/Data}}/expectUserResponse',
      Value: '{{not Send.ShouldClose}}',
      ValueType: 'boolean'
    },
    */

    /* Obsolete?
    'Send/Text/Platform': {
      Criteria: 'true',
      Target: 'fulfillmentMessages[+]/platform',
      Value: 'GOOGLE_HANGOUTS'
    },
    */

    'Send/Text': 'fulfillment_response/messages[+]/text/text[+]',

    /* TODO: Repeat
    'Context/multivocal_repeat/parameters/Ssml': {
      Criteria: '{{Response.ShouldRepeat}}',
      Target: '{{Send/Data}}/richResponse/items[+]/simpleResponse/ssml',
      Value: '{{#Ssml Voice}}{{{Context.multivocal_repeat.parameters.Ssml}}}{{/Ssml}}'
    },
    'Context/multivocal_repeat/parameters/Text': {
      Criteria: '{{Response.ShouldRepeat}}',
      Target: '{{Send/Data}}/richResponse/items[=]/simpleResponse/displayText'
    },
    */

    /* Cards, options, etc aren't supported in generic Dialogflow */
    /* User info isn't supported in generic Dialogflow */

    /* TODO: Session entity types
    'Send/Types': 'sessionEntityTypes'
    */
  }
};
