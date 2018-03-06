module.exports = {
  /*
  'Send/ContextList': 'outputContexts',
  */
  'Send': {
    Target: 'source',
    Value:  'ACTIONS_ON_GOOGLE'
  },
  'Send/ShouldClose': {
    Target: 'payload/google/expectUserResponse',
    Value: '{{not Send.ShouldClose}}',
    ValueType: 'boolean'
  },
  'Ssml': {
    Target: [
      'payload/google/richResponse/items[0]/simpleResponse/ssml'
    ]
  },
  'Txt': {
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
  'User/State':{
    Target: 'payload/google/userStorage',
    ValueType: 'string'
  },
  'Requirements/Intent':'payload/google/systemIntent'
};
