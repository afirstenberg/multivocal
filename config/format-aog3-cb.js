module.exports = {
  criteria: {
    Terms: [
      "{{Platform.IsActionsOnGoogle}}",
      "{{eq Platform.ActionsSDKVersion '3'}}"
    ],
    Op: "and"
  },
  tasks: {
    'Body/session/id':'session/id',
    'Body/scene/name':'scene/name',

    'Send/ContextList': {
      Target: 'session/params',
      Value:
      '{{#each Send.ContextList}}'+
        '{{#Set "_Tmp"}}_This/{{this.name}}{{/Set}}'+
        '{{Set  @root._Tmp this.parameters}}'+
      '{{/each}}'
    },

    'NextScene': 'scene/next/name',
    'Send/ShouldClose': {
      Criteria: '{{Send.ShouldClose}}',
      Target: 'scene/next/name',
      Value: 'actions.page.END_CONVERSATION'
    },
    'Send/Ssml': {
      Target: [
        'prompt/firstSimple/speech'
      ],
      Value: '{{#Ssml Voice}}{{{Send.Ssml}}}{{/Ssml}}'
    },
    'Send/Text': {
      Target: [
        'prompt/firstSimple/text'
      ]
    },

    /* TODO: repeat
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

    /* TODO: rich responses
    'Send/Table': '{{Send/Data}}/richResponse/items[+]/tableCard',
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
      Debug: '{{JSONstringify Send.Card}}',
      Target: '{{Send/Data}}/richResponse/items[+]/basicCard/title',
      Value: ''
    },
    'Send/Card/Title':{
      Criteria: '{{Send.Card}}',
      Target: '{{Send/Data}}/richResponse/items[=]/basicCard/title',
      Value: '{{First Msg.Option.Title Send.Card.Title}}'
    },
    'Send/Card/Body':        '{{Send/Data}}/richResponse/items[=]/basicCard/formattedText',
    'Send/Card/ImageUrl':    '{{Send/Data}}/richResponse/items[=]/basicCard/image/url',
    'Send/Card/ImageText':   '{{Send/Data}}/richResponse/items[=]/basicCard/image/accessibilityText',
    'Send/Card/ImageBorder': '{{Send/Data}}/richResponse/items[=]/basicCard/imageDisplayOptions',
    'Send/Card/Url':{
      Target: '{{Send/Data}}/richResponse/items[=]/basicCard/buttons[+]',
      Value:
        '{{Set "_This/openUrlAction/url" Send.Card.Url}}'+
        '{{Set "_This/title" (First Send.Card.Title Send.Card.Footer "Visit")}}'
    },
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

    /* Media Response */
    'Msg/Audio/Url':      'prompt/content/media/url',
    'Msg/Audio/Title':    'prompt/content/media/name',
    'Msg/Audio/Body':     'prompt/content/media/description',
    'Msg/Audio/IconUrl':  'prompt/content/media/image/icon/url',
    'Msg/Audio/ImageUrl': 'prompt/content/media/image/large/url',

    /* TODO: Interactive Canvas
    'Send/Page/Data':     '{{Send/Data}}/richResponse/items[+]/htmlResponse/updatedState',
    'Send/Page/Url':      '{{Send/Data}}/richResponse/items[=]/htmlResponse/url',
    */

    /* Suggestion chips */
    'Send/Suggestions': {
      Criteria: '{{and (isArray Msg.Suggestions) (length Msg.Suggestions)}}',
      Target: 'prompt/suggestions',
      Value:
      '{{#each Msg.Suggestions}}'+
      '{{Set "_This[+]/title" this}}'+
      '{{/each}}'
    },

    'User/State': 'user/params',

    /* TODO: Requirements / Permissions / "Helper" requests
    'Send/Intent':'{{Send/Data}}/systemIntent',
    */

    /* Session types */
    'Send/Types': 'session/typeOverrides'
  }
};
