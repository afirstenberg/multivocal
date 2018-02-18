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
  'Card': 'data/google/richResponse/items[+]/basicCard',
  'Suggestions': {
    Criteria: '{{and (isArray Suggestions) (length Suggestions)}}',
    Target: 'data/google/richResponse/suggestions',
    Value:
      '{{#each Suggestions}}'+
      '{{Set "_This[+]/title" this}}'+
      '{{/each}}'
  },
  'User/State':{
    Target: 'data/google/userStorage',
    ValueType: 'string'
  },
  'Requirements/Intent':'data/google/systemIntent'
};
