module.exports = {
  criteria: {
    Terms: [
      "{{Platform.IsActionsOnGoogle}}",
      "{{eq Platform.DialogflowVersion '2'}}"
    ],
    Op: "and"
  },
  tasks: {
    'Send/ContextList': {
      Target: 'outputContexts',
      Value:
      '{{#each Send.ContextList}}'+
        '{{#Set "_This[+]/name"}}{{@root.Body.session}}/contexts/{{this.name}}{{/Set}}'+
        '{{Set  "_This[=]/lifespanCount" this.lifespan}}'+
        '{{Set  "_This[=]/parameters"    this.parameters}}'+
      '{{/each}}'
    },
    'Send/ShouldClose': {
      Target: 'payload/google/expectUserResponse',
      Value: '{{not Send.ShouldClose}}',
      ValueType: 'boolean'
    },
    'Send/Ssml': {
      Target: [
        'payload/google/richResponse/items[0]/simpleResponse/ssml'
      ],
      Value: '{{#Ssml Voice}}{{{Send.Ssml}}}{{/Ssml}}'
    },
    'Send/Text': {
      Target: [
        'payload/google/richResponse/items[0]/simpleResponse/displayText'
      ]
    },
    'Msg/Card': 'payload/google/richResponse/items[+]/basicCard',
    'Msg/Suggestions': {
      Criteria: '{{and (isArray Msg.Suggestions) (length Msg.Suggestions)}}',
      Target: 'payload/google/richResponse/suggestions',
      Value:
      '{{#each Msg.Suggestions}}'+
        '{{Set "_This[+]/title" this}}'+
      '{{/each}}'
    },
    'Msg/Option/Title': 'payload/google/systemIntent/data/{{Msg.Option.SelectType}}Select/title',
    'Msg/Option/Items': {
      Target: 'payload/google/systemIntent/data/{{Msg.Option.SelectType}}Select/items',
      Value:
      '{{#each Msg.Option.Items}}'+
        '{{#Set "_This[+]/optionInfo/key"}}{{Setting "Option/Prefix"}}{{@index}}{{/Set}}'+
        '{{Set "_This[=]/title"                   this.Title}}'+
        '{{Set "_This[=]/description"             this.Body}}'+
        '{{#if (and this.ImageUrl this.ImageText)}}'+
          '{{Set "_This[=]/image/url"               this.ImageUrl}}'+
          '{{Set "_This[=]/image/accessibilityText" this.ImageText}}'+
        '{{/if}}'+
      '{{/each}}'
    },
    'Msg/Option/SelectType/Type': {
      Criteria: '{{Msg.Option}}',
      Target: 'payload/google/systemIntent/data/@type',
      Value: 'type.googleapis.com/google.actions.v2.OptionValueSpec'
    },
    'Msg/Option/SelectType/Intent': {
      Criteria: '{{Msg.Option}}',
      Target: 'payload/google/systemIntent/intent',
      Value: 'actions.intent.OPTION'
    },
    'Msg/Audio': {
      Target: 'payload/google/richResponse/items[+]/mediaResponse/mediaType',
      Value: 'AUDIO'
    },
    'Msg/Audio/Url':      'payload/google/richResponse/items[=]/mediaResponse/mediaObjects[+]/contentUrl',
    'Msg/Audio/Title':    'payload/google/richResponse/items[=]/mediaResponse/mediaObjects[=]/name',
    'Msg/Audio/Body':     'payload/google/richResponse/items[=]/mediaResponse/mediaObjects[=]/description',
    'Msg/Audio/IconUrl':  'payload/google/richResponse/items[=]/mediaResponse/mediaObjects[=]/icon/url',
    'Msg/Audio/ImageUrl': 'payload/google/richResponse/items[=]/mediaResponse/mediaObjects[=]/largeImage/url',
    'User/State':{
      Target: 'payload/google/userStorage',
      ValueType: 'string'
    },
    'Requirements/Intent':'payload/google/systemIntent'
  }
};
