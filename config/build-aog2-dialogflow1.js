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
  'User/State':{
    Target: 'data/google/userStorage',
    ValueType: 'string'
  },
  'Requirements/Intent':'data/google/systemIntent'
};
