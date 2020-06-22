module.exports = {
  criteria: {
    Terms: [
      "{{eq Platform.DialogflowIntegration 'hangouts'}}",
      "{{eq Platform.DialogflowVersion '2'}}"
    ],
    Op: "and"
  },
  tasks: {
    'Platform/IsDialogflow':{
      TargetEnv: 'Send/Data',
      Value: ''
    },
    'Send/ContextList': {
      Target: 'outputContexts',
      Value:
      '{{#each Send.ContextList}}'+
        '{{#Set "_This[+]/name"}}{{@root.Body.session}}/contexts/{{this.name}}{{/Set}}'+
        '{{Set  "_This[=]/lifespanCount" this.lifespan}}'+
        '{{Set  "_This[=]/parameters"    this.parameters}}'+
      '{{/each}}'
    },

    /* TODO: Should close?
    'Send/ShouldClose': {
      Target: '{{Send/Data}}/expectUserResponse',
      Value: '{{not Send.ShouldClose}}',
      ValueType: 'boolean'
    },
    */

    'Send/Text/Platform': {
      Criteria: 'true',
      Target: 'fulfillmentMessages[+]/platform',
      Value: 'GOOGLE_HANGOUTS'
    },

    'Send/Text': {
      Target: [
        'fulfillmentText',
        'fulfillmentMessages[=]/text/text[+]'
      ]
    },

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

    'Msg/Option/Type': {
      TargetEnv: 'Send/Option',
      Debug: 'isArray={{isArray Msg.Option.Items}} eq1={{equalsLength Msg.Option.Items 1}}',
      Value:
        '{{#if (and (isArray Msg.Option.Items) (equalsLength Msg.Option.Items 1))}}'+
          '{{Set "_This/IsSingular" true}}'+
          '{{Set "Send/Card" Msg.Option.Items.[0]}}'+
        '{{else if (and (eq Msg.Option.Type "carousel") Msg.Option.Items.[0].Url)}}'+
          '{{#if Session.Feature.WEB_BROWSER}}'+
            '{{Set "_This/Path" "richResponse/items[+]"}}'+
            '{{Set "_This/Type" "carouselBrowse"}}'+
            '{{Set "_This/IsRichResponse" true}}'+
            '{{Set "_This/IsPlural" true}}'+
          '{{/if}}'+
        '{{else if (eq Msg.Option.Type "carousel")}}'+
          '{{Set "_This/Path" "systemIntent/data"}}'+
          '{{Set "_This/Type" "carouselSelect"}}'+
          '{{Set "_This/IsSystemIntent" true}}'+
          '{{Set "_This/IsPlural" true}}'+
        '{{else}}'+
          '{{Set "_This/Path" "systemIntent/data"}}'+
          '{{Set "_This/Type" "listSelect"}}'+
          '{{Set "_This/IsSystemIntent" true}}'+
          '{{Set "_This/IsPlural" true}}'+
        '{{/if}}'
    },
    'Send/Card':{
      Debug: '{{{JSONstringify Send.Card}}}',
      Target: 'fulfillmentMessages[+]/platform',
      Value: 'GOOGLE_HANGOUTS'
    },
    'Send/Card/Title':{
      Criteria: '{{Send.Card}}',
      Debug: '{{{JSONstringify Send.Card.Payload}}}',
      Target: 'fulfillmentMessages[=]/payload/hangouts/header/title',
      Value: '{{First Msg.Option.Title Send.Card.Title}}'
    },
    'Send/Card/Body':        'fulfillmentMessages[=]/payload/hangouts/sections[+]/widgets[+]/textParagraph/text',
    /* TODO: Card images
    'Send/Card/ImageUrl':    '{{Send/Data}}/richResponse/items[=]/basicCard/image/url',
    'Send/Card/ImageText':   '{{Send/Data}}/richResponse/items[=]/basicCard/image/accessibilityText',
    'Send/Card/ImageBorder': '{{Send/Data}}/richResponse/items[=]/basicCard/imageDisplayOptions',
    */
    // TODO: Handle multiple buttons
    'Send/Card/Url':{
      Target: 'fulfillmentMessages[=]/payload/hangouts/sections[+]/widgets[+]/buttons[+]',
      Value:
        '{{Set "_This/textButton/onClick/openLink/url" Send.Card.Url}}'+
        '{{Set "_This/textButton/text" (First Send.Card.Title Send.Card.Footer "Visit")}}'
    },
    /* TODO: Support multiple cards? This would be done by adding more... payload objects?
    'Msg/Option/Title': {
      Criteria: '{{Send.Option.IsPlural}}',
      Target: '{{Send/Data}}/{{Send.Option.Path}}/{{Send.Option.Type}}/title'
    },
    'Msg/Option/Items': {
      Criteria: '{{Send.Option.IsPlural}}',
      Target: '{{Send/Data}}/{{Send.Option.Path}}/{{Send.Option.Type}}/items',
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
      Target: '{{Send/Data}}/systemIntent/data/@type',
      Value: 'type.googleapis.com/google.actions.v2.OptionValueSpec'
    },
    'Msg/Option/SelectType/Intent': {
      Criteria: '{{Send.Option.IsSystemIntent}}',
      Target: '{{Send/Data}}/systemIntent/intent',
      Value: 'actions.intent.OPTION'
    },
    */

    /* TODO: User info?
    'User/State':{
      Target: '{{Send/Data}}/userStorage',
      ValueType: 'string'
    },
    */

    'Send/Intent':'{{Send/Data}}/systemIntent',
    'Send/Types': 'sessionEntityTypes'
  }
};
