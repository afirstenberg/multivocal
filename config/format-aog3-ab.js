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

    'Send/NextNode': 'scene/next/name',
    'Send/ShouldClose': {
      Criteria: '{{Send.ShouldClose}}',
      Target: 'scene/next/name',
      Value: 'actions.page.END_CONVERSATION'
    },
    'Msg/Ssml': {
      Criteria: '{{or Msg.Ssml Msg.Text}}',
      Target: [
        'prompt/firstSimple/speech'
      ],
      Value: '{{#Ssml Voice}}{{{First Msg.Ssml Msg.Text}}}{{/Ssml}}'
    },
    'Msg/Text': {
      Target: [
        'prompt/firstSimple/text'
      ]
    },
    'Suffix/Ssml': {
      Criteria: '{{and (not NoSuffixNeeded) (or Suffix.Ssml Suffix.Text)}}',
      Target: [
        'prompt/lastSimple/speech'
      ],
      Value: '{{#Ssml Voice}}{{{First Suffix.Ssml Suffix.Text}}}{{/Ssml}}'
    },
    'Suffix/Text': {
      Criteria: '{{and (not NoSuffixNeeded) Suffix.Text}}',
      Target: [
        'prompt/lastSimple/text'
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

    /* Session types */
    /* Needs to be before list/options, since those change session/typeOverrides */
    'Send/Types': 'session/typeOverrides',

    /* rich responses */
    /*'Send/Table': '{{Send/Data}}/richResponse/items[+]/tableCard',*/
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
        '{{else if (or (eq Msg.Option.Type "carousel") (eq Msg.Option.Type "collection"))}}'+
          '{{log "carousel"}}'+
          '{{Set "_This/Path" "prompt/content"}}'+
          '{{Set "_This/Type" "collection"}}'+
          '{{Set "_This/IsPlural" true}}'+
        '{{else}}'+
          '{{log "list"}}'+
          '{{Set "_This/Path" "prompt/content"}}'+
          '{{Set "_This/Type" "list"}}'+
          '{{Set "_This/IsPlural" true}}'+
        '{{/if}}'+
        '{{{log "_This %s" (JSONstringify _This)}}}'
    },

    'Send/Card':{
      Debug: '{{JSONstringify Send.Card}}',
      Target: 'prompt/content/card/title',
      Value: ''
    },
    'Send/Card/Title':{
      Criteria: '{{Send.Card}}',
      Target: 'prompt/content/card/title',
      Value: '{{First Msg.Option.Title Send.Card.Title}}'
    },
    'Send/Card/Body':        'prompt/content/card/text',
    'Send/Card/ImageUrl':    'prompt/content/card/image/url',
    'Send/Card/ImageText':   'prompt/content/card/image/alt',
    'Send/Card/ImageBorder': 'prompt/content/card/imageFill',
    'Send/Card/Url':{
      Target: 'prompt/content/card/button',
      Value:
        '{{Set "_This/open/url" Send.Card.Url}}'+
        '{{Set "_This/name" (First Send.Card.Title Send.Card.Footer "Visit")}}'
    },

    /* Lists/Options related to typeOverrides */
    'Msg/Option/Title': {
      Criteria: '{{Send.Option.IsPlural}}',
      Debug: 'IsPlural={{Send.Option.IsPlural}} Title={{Msg.Option.Title}} target={{Send.Option.Path}}/{{Send.Option.Type}}/title',
      Target: '{{Send.Option.Path}}/{{Send.Option.Type}}/title'
    },
    'Msg/Options/Items/Key': {
      Criteria: '{{Send.Option.IsPlural}}',
      Target: '{{Send.Option.Path}}/{{Send.Option.Type}}/items',
      Value:
        '{{#each Msg.Option.Items}}'+
          '{{#Set "_This[+]/key"}}{{Setting "Option/Prefix"}}{{@index}}{{/Set}}'+
        '{{/each}}'
    },
    'Msg/Options/Type/Name': {
      Criteria: '{{Send.Option.IsPlural}}',
      Target: "session/typeOverrides[+]/name",
      Value: "{{Setting.Option.TypeName}}"
    },
    'Msg/Options/Type/Mode': {
      Criteria: '{{Send.Option.IsPlural}}',
      Target: "session/typeOverrides[=]/typeOverrideMode",
      Value: "TYPE_REPLACE"
    },
    'Msg/Option/Type/Items': {
      Criteria: '{{Send.Option.IsPlural}}',
      Target: 'session/typeOverrides[=]/synonym/entries',
      Value:
      '{{#each Msg.Option.Items}}'+
        '{{#Set "_This[+]/name"}}{{Setting "Option/Prefix"}}{{@index}}{{/Set}}'+
        '{{Set "_This[=]/synonyms[+]"          this.Title}}'+
        '{{Set "_This[=]/display/title"        this.Title}}'+
        '{{#if this.Body}}'+
          '{{Set "_This[=]/display/description"  this.Body}}'+
        '{{/if}}'+
        '{{#if (and this.ImageUrl this.ImageText)}}'+
          '{{Set "_This[=]/display/image/url"    this.ImageUrl}}'+
          '{{Set "_This[=]/display/image/alt"    this.ImageText}}'+
        '{{/if}}'+
      '{{/each}}'+
      ''
    },

    /* FIXME: Browsing carousel */


    /* Media Response */
    'Msg/Audio/Ack': {
      Target: 'prompt/content/media/mediaType',
      Value: "MEDIA_STATUS_ACK"
    },
    'Msg/Audio/Url':      'prompt/content/media/mediaObjects[+]/url',
    'Msg/Audio/Offset':   'prompt/content/media/startOffset',
    'Msg/Audio/Title':    'prompt/content/media/mediaObjects[=]/name',
    'Msg/Audio/Body':     'prompt/content/media/mediaObjects[=]/description',
    'Msg/Audio/IconUrl':  'prompt/content/media/mediaObjects[=]/image/icon/url',
    'Msg/Audio/ImageUrl': 'prompt/content/media/mediaObjects[=]/image/large/url',
    'DefCon/Setting/Media/Controls': {
      Criteria: '{{and Msg.Audio.Url (not Config.Setting.Media.Controls)}}',
      Target: 'prompt/content/media/optionalMediaControls'
    },
    'Config/Setting/Media/Controls': {
      Criteria: '{{and Msg.Audio.Url (not DefCon.Setting.Media.Controls)}}',
      Target: 'prompt/content/media/optionalMediaControls'
    },

    /* Interactive Canvas */
    'Send/Page/Data':           'prompt/canvas/data',
    'Send/Page/Url':            'prompt/canvas/url',
    'Send/Page/SuppressMic':    {
      Criteria: 'true',
      Target: 'prompt/canvas/suppressMic'
    },

    /* Suggestion chips */
    'Send/Suggestions': {
      Criteria: '{{and (isArray Msg.Suggestions) (length Msg.Suggestions)}}',
      Target: 'prompt/suggestions',
      Value:
      '{{#each Msg.Suggestions}}'+
      '{{Set "_This[+]/title" this}}'+
      '{{/each}}'
    },

    'User/State': 'user/params'

    /* TODO: Requirements / Permissions / "Helper" requests
    'Send/Intent':'{{Send/Data}}/systemIntent',
    */

  }
};
