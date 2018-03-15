module.exports = {
  criteria: {
    Terms: [
      "{{Platform.IsActionsOnGoogle}}",
      "{{eq Platform.DialogflowVersion '1'}}"
    ],
    Op: "and"
  },
  tasks: {
    'Send/ContextList': 'contextOut',
    'Send/ShouldClose': {
      Target: 'data/google/expectUserResponse',
      Value: '{{not Send.ShouldClose}}',
      ValueType: 'boolean'
    },
    'Send/Ssml': {
      Target: [
        'data/google/richResponse/items[0]/simpleResponse/ssml',
        'speech'
      ],
      Value: '{{#Ssml Voice}}{{{Send.Ssml}}}{{/Ssml}}'
    },
    'Send/Text': {
      Target: [
        'data/google/richResponse/items[0]/simpleResponse/displayText',
        'displayText'
      ]
    },
    'Context/multivocal_repeat/parameters/Ssml': {
      Criteria: '{{Response.ShouldRepeat}}',
      Target: 'data/google/richResponse/items[+]/simpleResponse/ssml',
      Value: '{{#Ssml Voice}}{{{Context.multivocal_repeat.parameters.Ssml}}}{{/Ssml}}'
    },
    'Context/multivocal_repeat/parameters/Text': {
      Criteria: '{{Response.ShouldRepeat}}',
      Target: 'data/google/richResponse/items[=]/simpleResponse/displayText'
    },
    'Msg/Card': 'data/google/richResponse/items[+]/basicCard',
    'Msg/Suggestions': {
      Criteria: '{{and (isArray Msg.Suggestions) (length Msg.Suggestions)}}',
      Target: 'data/google/richResponse/suggestions',
      Value:
      '{{#each Msg.Suggestions}}'+
        '{{Set "_This[+]/title" this}}'+
      '{{/each}}'
    },
    'Msg/Option/Type': {
      TargetEnv: 'Send/Option',
      Value:
        '{{#if (and (eq Msg.Option.Type "carousel") Msg.Option.Items.[0].Url)}}'+
          '{{Set "_This/Path" "richResponse/items[+]"}}'+
          '{{Set "_This/Type" "carouselBrowse"}}'+
          '{{Set "_This/IsRichResponse" true}}'+
        '{{else if (eq Msg.Option.Type "carousel")}}'+
          '{{Set "_This/Path" "systemIntent/data"}}'+
          '{{Set "_This/Type" "carouselSelect"}}'+
          '{{Set "_This/IsSystemIntent" true}}'+
        '{{else}}'+
          '{{Set "_This/Path" "systemIntent/data"}}'+
          '{{Set "_This/Type" "listSelect"}}'+
          '{{Set "_This/IsSystemIntent" true}}'+
        '{{/if}}'
    },
    'Msg/Option/Title': 'data/google/{{Send.Option.Path}}/{{Send.Option.Type}}/title',
    'Msg/Option/Items': {
      Target: 'data/google/{{Send.Option.Path}}/{{Send.Option.Type}}/items',
      Value:
      '{{#each Msg.Option.Items}}'+
        '{{Set "_This[+]/title"                   this.Title}}'+
        '{{Set "_This[=]/description"             this.Body}}'+
        '{{#if (Val "Send/Option/IsSystemIntent")}}'+
          '{{#Set "_This[=]/optionInfo/key"}}{{Setting "Option/Prefix"}}{{@index}}{{/Set}}'+
        '{{/if}}'+
        '{{#if (and this.ImageUrl this.ImageText)}}'+
          '{{Set "_This[=]/image/url"               this.ImageUrl}}'+
          '{{Set "_This[=]/image/accessibilityText" this.ImageText}}'+
        '{{/if}}'+
        '{{#if (Val "Send/Option/IsRichResponse")}}'+
          '{{Set "_This[=]/openUrlAction/url"       this.Url}}'+
          '{{Set "_This[=]/footer"                  this.Footer}}'+
        '{{/if}}'+
      '{{/each}}'
    },
    'Msg/Option/SelectType/Type': {
      Criteria: '{{Send.Option.IsSystemIntent}}',
      Target: 'data/google/systemIntent/data/@type',
      Value: 'type.googleapis.com/google.actions.v2.OptionValueSpec'
    },
    'Msg/Option/SelectType/Intent': {
      Criteria: '{{Send.Option.IsSystemIntent}}',
      Target: 'data/google/systemIntent/intent',
      Value: 'actions.intent.OPTION'
    },
    'Msg/Audio': {
      Target: 'data/google/richResponse/items[+]/mediaResponse/mediaType',
      Value: 'AUDIO'
    },
    'Msg/Audio/Url':      'data/google/richResponse/items[=]/mediaResponse/mediaObjects[+]/contentUrl',
    'Msg/Audio/Title':    'data/google/richResponse/items[=]/mediaResponse/mediaObjects[=]/name',
    'Msg/Audio/Body':     'data/google/richResponse/items[=]/mediaResponse/mediaObjects[=]/description',
    'Msg/Audio/IconUrl':  'data/google/richResponse/items[=]/mediaResponse/mediaObjects[=]/icon/url',
    'Msg/Audio/ImageUrl': 'data/google/richResponse/items[=]/mediaResponse/mediaObjects[=]/largeImage/url',
    'User/State':{
      Target: 'data/google/userStorage',
      ValueType: 'string'
    },
    'Requirements/Intent':'data/google/systemIntent'
  }
};
