module.exports = {
  'Send/ContextList': 'contextOut',
  'Send/ShouldClose': {
    Target: 'data/google/expectUserResponse',
    Value: '{{not Send.ShouldClose}}',
    ValueType: 'boolean'
  },
  'Ssml': {
    Target: [
      'data/google/richResponse/items[0]/simpleResponse/ssml',
      'speech'
    ]
  },
  'Txt': {
    Target: [
      'data/google/richResponse/items[0]/simpleResponse/displayText',
      'displayText'
    ]
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
  'Msg/Option/Title': 'data/google/systemIntent/data/{{Msg.Option.SelectType}}Select/title',
  'Msg/Option/Items': {
    Target: 'data/google/systemIntent/data/{{Msg.Option.SelectType}}Select/items',
    Value:
      '{{#each Msg.Option.Items}}'+
        '{{#Set "_This[+]/optionInfo/key"}}OPTION_{{@index}}{{/Set}}'+
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
    Target: 'data/google/systemIntent/data/@type',
    Value: 'type.googleapis.com/google.actions.v2.OptionValueSpec'
  },
  'Msg/Option/SelectType/Intent': {
    Criteria: '{{Msg.Option}}',
    Target: 'data/google/systemIntent/intent',
    Value: 'actions.intent.OPTION'
  },
  'User/State':{
    Target: 'data/google/userStorage',
    ValueType: 'string'
  },
  'Requirements/Intent':'data/google/systemIntent'
};
