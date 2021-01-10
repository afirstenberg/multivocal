# multivocal
A node.js library to assist with building best practice, configuration driven, 
Actions for the Google Assistant.

*(This README is a work in progress, although it documents much of
the platform, there are gaps. The intent is to have it completed
by version 1.0.0.)*

## What is multivocal?

Multivocal is a library that tries to bring a new approach to helping
you write webhooks for the Google Assistant, Google Chat (and, hopefully someday,
other voice agents and bots).

### Why multivocal?

We found that the traditional method of building a webhook suffered from
several problems:

* There was lots of boilerplate code required to get very simple things
  to work.
* Best practices for handling no input, repeated bad input, welcoming
  users, prompting users, varying responses, and other conversational 
  components add even more code.
* All this additional code is beyond the actual logic we want to implement.
* The text for responses were often mixed in with the business logic,
  making it difficult to add new language support or change the possible
  responses.
  
As we developed more and more Actions, we began to want a library that
met a few goals:

1. Reduce boilerplate as much as possible.
2. Use sane defaults and make it easy to override those defaults.
3. Our code should be focused on the results - not how to transmit those
   results.
4. Responses to the user should be configuration driven, allowing us to
   easily add and modify responses that incorporate the results from
   our business logic.

That evolved into Multivocal.

### When does it make sense to use multivocal?

We think it makes sense for any application you're writing for
platforms such as

* Dialogflow ES (Dialogflow 2) with 
    * The Google Assistant (Actions on Google 2)
    * Google Chat (formerly Hangouts Chat)
* Experimenting with Dialogflow CX (Dialogflow 3)
* The Actions Builder and Actions SDK for the Google Assistant (Actions on Google 3)

We hope to expand the library so it makes sense to use for 
other platforms that use Dialogflow, for the
Amazon Alexa, and for Samsung's Bixby.

Right now, it targets webhooks that run on the Firebase Cloud Functions
platform, but it should work on any platform that uses Express-like
handling or AWS Lambda.

### Who is behind multivocal?

Multivocal was started by Allen "Prisoner" Firstenberg, a Google
Developer Expert and developer of several Actions for the Assistant.

But multivocal is open source - we would love to see your contributions!

### Where can I get multivocal?

Source for multivocal is available at https://github.com/afirstenberg/multivocal.
You can also find documentation there and at https://multivocal.info/

There are sample projects (ranging from fairly sparse projects we use
to test things out to more full-featured examples) and additional 
documentation linked from https://multivocal.info/

You can report bugs and issues at the github project page.

### How do I install and use multivocal?

You can install it using `npm install --save multivocal`.

As for using Multivocal... well... that takes up much of the rest
of this document, as well as other documentation available from github
or at https://multivocal.info/

## Hello World

Using multivocal to implement a basic fulfillment webhook for a Dialogflow
based action built on Firebase Cloud Functions is straightforward with just
a little boilerplate.

```javascript
const Multivocal = require('multivocal');

new Multivocal.Config.Simple({
  Local: {
    und: {
      Response: {
        "Action.multivocal.welcome": [
          {
            Template: {
              Text: "Hello world."
            },
            ShouldClose: true
          }
        ]
      }
    }
  }
});

exports.webhook = Multivocal.processFirebaseWebhook;
```

We can roughly break this into three parts:

1.  Load the multivocal library.

2.  Build our configuration.  
   
    We'll use a simple configuration object that takes the JSON for the configuration.
   
    We need to define the _Action.multivocal.welcome_ response, 
    and we'll define it for the _undefined_
    locale. This response says that for any incoming request that is for
    the Action with the name `multivocal.welcome`, format the Template with
    this text to use as our message.
    Furthermore, after we send this message, we should close the conversation.
   
    The `multivocal.welcome` Action is one that is provided by the standard
    Intents, and is called when the conversation begins.
    
    Building the configuration automatically adds it to Multivocal's
    configuration.
   
3.  Register the function to be called when a request comes in from Dialogflow
    and have multivocal process it.
    
    In this case, we're using the Firebase webhook processor to process
    from Firebase Cloud Functions, but there are also processors for 
    Google Cloud Functions (which are slightly different), an Express
    function, or if you're using AWS Lambda. If you're using something
    else, you can build the environment yourself, call the processing,
    and send the JSON response.
    
A very similar configuration could be written for an Actions Builder project,
and mostly be structured the same way. (The biggest difference is that 
handler names aren't allowed to have a dot in them.)
    
## Features

### Naming Convention

Although there are some exceptions, multivocal reserves the following naming
conventions as things that will be defined for the library. These names are
found in the configuration object, in properties in objects, and in Dialogflow
configuration. In order to maintain forward compatibility, you shouldn't
use things named this way unless they've been documented:

* Names starting with a Capital Letter 
  (Response, Action, etc)
* Names starting with one or more underscore, followed by a _Capital _Letter
  (_Builder, _Task, etc)
* Names starting with "multivocal", in any case
  (multivocal_session, Multivocal_counter)

### Configuration

#### Simple Object configuration

Since most configuration is represented internally as JavaScript Object
attributes, it makes sense to use a JavaScript Object as one form of
configuration. You can add this configuration by creating a new
`Multivocal.Config.Simple` object and passing in an Object with attributes.

```
var config = {
  Local: {
    und: {
      Response: {
        "Action.multivocal.welcome": [
          {
            Template: {
              Text: "Hello world."
            },
            ShouldClose: true
          }
        ]
      }
    }
  }
};
new Multivocal.Config.Simple( config );
```

#### Firebase realtime database configuration

Firebase represents its entire realtime database as a JSON tree, with
some restrictions on the values of the keys. The `Multivocal.Config.Firebase`
configuration can treat any path in a database as an object to be used
for configuration. You can specify the path in the configuration, or
use the default of `multivocal`. If you're using Firebase Cloud Functions,
you don't need to provide the firebase settings for initialization, otherwise
you will need to provide settings that include, at least, a URL and
credentials.

The upside to using Firebase to store responses is that it is very
easy to update the database (either manually or by uploading JSON)
and the changes will be live immediately.

One catch is that Firebase doesn't allow some characters in the key value, so
you need to replace them with other values in Firebase and the system will
convert them. Conversions done are:

* underscore _ converted to period .
* vertical bar | converted to forward slash /

So the URL https://example.com/ would be written as https:||example_com|

For many uses, this should be sufficient:
```
new Multivocal.Config.Firebase();
```

If you need to specify configuration, the name of the firebase app,
and/or the path to use for configuration, you may need something more
like this:
```
var firebase = {
  config: {
    ...
  },
  name: undefined,            // Uses default Firebase app
  path: 'config/multivocal'   // Defaults to 'multivocal'
};
new Multivocal.Config.Firebase( firebase );
```

#### Cloud Firestore configuration

Firebase's Cloud Firestore database provides a way to store documents
that contain attributes and values. Since these values can be object-like,
a document maps very nicely to a JavaScript object. The `Multivocal.Config.Firestore`
configuration treats a document (specified by a collection name and
document name) as an object. It defaults to a collection name of `config`
and a document name of `multivocal`. If you're using Firebase Cloud
Functions, you don't need to provide the firebase settings for initialization,
otherwise you will need to provide settings that include, at least, 
connection information and credentials.

The upside to using Firestore to store responses and configuration is
that it is very easy to update the database (generally manually, or
by using a program to upload JSON) and the changes will be live immediately.

Unlike the Firebase Realtime Database, Firestore allows for attribute
names with periods.

For many uses, this should be sufficient:
```
new Multivocal.Config.Firestore()
```

If you need to specify configuration, the name of the firebase app,
the collection, and/or the document, you may need something more
like this:
```
var firestore = {
  config: {
    ...
  },
  name: undefined,            // Uses default Firebase app
  collection: 'stuff',        // Uses 'config' by default
  document:   'mv'            // Uses 'multivocal' by default
};
new Multivocal.Config.Firestore( firestore );
```

#### Merged configuration

There is also a configuration which takes a list of other configuration
objects and merges them, with latter configurations overriding earlier
ones. This is a deep merge, so it can be used to change specific fields.

This is primarily used internally to get the configuration available
when Multivocal is called.

#### Adding your own configuration source

If none of these suit your needs, you can create a class whose instances
do get the configuration from whatever source you need. The only requirement
is that it have a method `get()` which returns a Promise that resolves
to an object with attributes. This object should be an instance that
is different than one returned by any other call to `get()`. (In the
event it is modified.)

You register the configuration instance by calling `Multivocal.addConfig()`. 
The built-in configuration classes do this for you as part of creating
the instance, and you may wish to adopt this model as well.

#### Default and Standard configurations

Multivocal installs two configuration instances when it starts up.

The default configuration is available in the DefCon environment setting.
It contains "last resort" values and default settings. You **should not**
touch this environment setting - you can override everything in your own
configurations.

The standard configuration is loaded as the first configuration and
contains some basic phrases and tools. You typically don't want to
eliminate it, but it is possible if needed.

(TODO: Point to more complete documentation elsewhere)

### Pre-Processing and Preconditions

Environment settings built:

* Preprocess

    * Fail
    
        True if preprocessing fails and further processing should halt, possibly 
        returning something.
    
    * Msg

(TODO: Work in progress)

#### Actions on Google Ping

If the request matches a pattern determined by the 
`Config/Setting/Precondition/GooglePing` setting, set the `Preprocess/Fail`
environment to true and send back a "Pong" message.

### Processing, the Environment, and Paths

#### Platform detection

### Environment builders

Environment settings built:

* Platform

* Hostname

* Locale

* Lang

* Parameter

* Context

* User/State

* Session/State

* Session/Counter

* Session/Consecutive

* Session/StartTime

* Option
    See "Lists, Options, and Cards"

* MediaStatus

* MediaProgress

* Session/Feature

* User/Feature

* Intent

* IntentName

* Action

* ActionName

* Default

#### User authentication

Environment settings built (if appropriate):

* User/Id

    An ID which is guaranteed to be unique between different platforms
    but maintain a 1:1 mapping with the native ID or the multivocal
    generated ID if appropriate.
    
    Actions on Google is deprecating their native ID, and plan to
    remove it on 1 Jun 2019. Multivocal will use this ID for now, and
    will switch to using a generated ID at some point before the cutoff
    date. After the cutoff date, the old ID will continue to be used
    for users that had initiated sessions before multivocal switches.
    
* User/State/Id

    Contains the native or multivocal generated ID that was used to
    generate `User/Id`.

* User/IsAuthenticated

    True if *either* of the following are true:
    * User/AccessToken has been set
    * User/IdentityToken has been set with a valid token

* User/AccessToken

    If the platform provides an access token, it is available here.
    The access token is usually generated by your OAuth2 server and
    you should verify it before use. Typically, you will want to use
    it to get the user's profile, at a minimum. If you wish, you can
    store this profile in the `User/Profile` environment setting
    (see below).

* User/IdentityToken

    If the platform provides an identity token (a signed JWT providing
    profile and other assertions), then this will be the raw and
    unverified token.

* User/Profile

    If the platform provides an identity token, and multivocal is able
    to validate the token, then this contains the profile information
    contained in the token.
    
    If the platform does not provide an identity token, or you have
    other means to get a more complete profile, you may wish to use
    this environment path to store one. However, be aware that this
    may overwrite the profile that is set by multivocal. If you're
    concerned about this - use a different environment path.

#### Adding your own builder

### Intents, Actions, and Outents

User actions are represented by two things: The Intent name and the Action name. 
Multivocal prefixes these with "Intent."
and "Action." respectively and stores them in the environment values below.

In general, for most platforms, you should be planning on the "Action".

* ActionName
    The action name provided from Dialogflow 1 or 2,
    the fulfillment key provided for Dialogflow 3,
    or the handler name provided from Actions Builder
* Action
    The action name prefixed with "Action."
* IntentName
    The intent name provided from Dialogflow or Actions Builder
* Intent
    The Intent name prefixed with "Intent."
* NodeName
    The scene name provided by the Actions Builder
    or the page name provided by Dialogflow 3.
* Node
    The Node name prefixed with "Node."

Multivocal uses the Intent and Action to determine which
handler should be called to do any additional processing and what
should be sent in response. The Node value is not used to determine 
the handler or response.

Additionally, Multivocal defines the concept of an "Outent". You can
set this environment setting in a handler to provide additional
choices for responses which may be different than the default ones you
provide for the intent or action. You do not need to prefix it with
"Outent.", although you're allowed to do so. You're not required to set
one at all, but if you do, it should be in the environment setting:

* Outent

Handlers and responses, and how Multivocal determines which ones to use,
are described in their own sections below.

#### Standard Dialogflow Intents/Actions

A standard set of intents, handlers, and responses are included
with Multivocal which handle most of the boilerplate tasks that you
need to consider. There are two parts to these standard components, one
is included when you initialize Multivocal, but the other requires you
to import a standard set of Intents into Dialogflow:

1. The standard handlers and responses (including a base library for
your own responses) are setup when Multivocal is first initialized. You
can override these behaviors with your own handlers and responses, but
you should keep in mind what they do by default.

2. There is a zipfile in `dialogflow/standard.zip` which contains the
corresponding Dialogflow Intent configurations. All the action settings
start with "multivocal.". You should *IMPORT* this zip file into
Dialogflow. If you're starting a new project, you can then delete the
older welcome and fallback intents. You'll also need to make sure the
timezone, language, fulfillment URL, and other settings are correct
for your project.

##### Action: welcome and multivocal.welcome

Increments the `User/State/NumVisits` environment value.

(TODO: Handle (possibly short-circuit?) Google's health check ping)

##### Action: quit and multivocal.quit

Sets the `Response/ShouldQuit` environment setting to true
after doing response processing.

##### Intent: input.none

##### Intent: input.unknown

##### Action: multivocal.unknown

##### Action: repeat and multivocal.repeat

Sets the `Response/ShouldRepeat` environment setting to true
after doing response processing.

##### Action: multivocal.about

Uses values from the `Config/Package` environment setting to respond
to questions about the version. Typically you'll set `Config/Package`
to the contents of your `package.json` file.

### Handlers

#### Built-in handlers

##### Default handler

#### Adding your own handler and setting an Outent

### Response, Suffix, Localization, and Templates

Multivocal has several steps to determine what should be sent as part of the
Response and Suffix:

1. A list of items containing `Template` parameters (or just strings) is fetched 
   from the configuration based on various factors, including the Locale, 
   Intent, Action, Outent, and Levels.
   
2. Some processing is done on these templates, including loading some templates
   from elsewhere in the configuration, evaluating template settings that will
   apply for future templates in the list, and filtering out some possible
   results based on criteria that are set.
   
   If the template just consists of a string, it is at this point that it is
   converted into a `Template` object by creating an object with a `Markdown`
   attribute set to the value of the string.
   
   The processing does **not** include applying values to the template at this point.
   
3. One of the templates is selected at random to be the `Response`.

4. The Response-type object is evaluated as a template to apply other values 
   in the environment, and other transformations are also done (for example,
   to handle Text or SSML attributes). 
   The results of doing this are mapped to the environment
   based on other settings described below. 
   
   For the `Response` configuration, the Template used will be in the
   `Response` environment setting and, once evaluated, will be in the `Msg`
   environment setting.
   
   For the `Suffix` configuration, the Template is saved in `SuffixResponse`
   and evaluated into `Suffix`.

#### Localization and the Path

All the Responses are contained under the `Config/Local` environment path, to
emphasize that these are expected to be localized responses. You can store
anything that you expect to be localized under this path as well (and there
are some ways to automatically have these processed as well, as we'll see
below).

Under this, there are a number of components to the path:

* `Locale`, `Lang`, and then the undefined language "und"
* The target (such as "response", but more details below)
* The `Outent`, `Intent`, and `Action` values or "Default"
* The `OutentLevel`, `InetntLevel`, and `ActionLevel` as appropriate

#### Conditions

#### Debug response

Response settings:

* Debug

  Typically an object (although just a string is allowed) that is evaluated
  as a template. The results are generally saved in the environment setting
  `Debug/*target*`, so if you're evaluating the `Response` configuration, the
  target is `Msg` so any debug information would be in `Debug/Msg`.
  
  When `Debug` is present, `Debug/Index` is also set with the response number.
  
Although you can specify `Debug` for each response (and sometimes you want to),
there is a shortcut that if a response contains *only* a Debug attribute, then
it will be used for all subsequent responses, similar to a `Base` response.

#### Base responses

Response settings:

* Base/Ref

* Base/Set

* Base/Condition

#### Template and other transformations

The Response selected is transformed into a value after applying a series
of functions, taking the results of one step and feeding it into the next:

1. Each text string in the Template object is treated as a 
   [Handlebars](https://handlebarsjs.com/)
   template string, with the entire environment passed in and available
   to the templating engine. (See below about available template functions
   and some special environment settings available.)
   
2. If the only attribute in the resultant value is named '_Value', then it's
   value becomes the result value.
   
3. If there is a `Markdown` field, it is used to create a `Text` or `Ssml`
   field if that field isn't present by passing it to the 
   [Speech Markdown](https://github.com/speechmarkdown/speechmarkdown-js)
   library. If a field *is* present, then it won't be overridden by 
   `Markdown`.   

4. If there is a `Text` or `Ssml` field, but not the other, then one is
   converted into the other using some simple transformations (converting the
   &, <, and > representations).
   
#### Template functions

In addition to functions available from 
[handlebars-helpers](https://github.com/helpers/handlebars-helpers),
multivocal provides several that are useful in your templates (and some that
are really only useful for multivocal itself).

##### Ssml

##### Oxford

##### Val

##### FirstVal

##### First

##### Shuffled

##### Pick

##### PickVal

##### Set

##### EndsWith

##### Setting

#### Template special environment settings

* _This

* _Result

#### FlexResponse configuration setting

Although `Msg` and `Suffix` are generated in the environment based on the
Response and Suffix settings, the system can apply these concepts (and the
steps outlined above) to create any environment values you wish. 
This is handled through a number of different configuration settings:

* Setting/FlexResponse/Targets

    The list of targets to evaluate. This initially defaults to "Response", but
    you can add other targets to evaluate additional values. When doing so,
    "Response" should probably be last on this list.

* Setting/FlexResponse/Path

    A series of paths that are evaluated both using the environment (to fill in
    values) and against the environment (once the path is determined - to get the
    value at that path). The first path that contains values will be used, even
    if all the values are later filtered out.

* _Target

    While evaluating each target in `Setting/FlexResponse/Targets`, the specific
    name being evaluated. This probably isn't very useful, but it is a crucial
    component in the Path.
    
* Setting/{{_Target}}/RawParameterName

    If you provide a string in the response instead of an object, multivocal
    will create a Template object with a single attribute with this name and
    a value of the string.
    
    By default, this is the value "_This", which means that the template
    (when ultimately evaluated) will attempt to map the resulting value to
    the target environment.
    
    The Response target, however, has this set to "Text", so an object
    containing a Text attribute will be set to the Msg environment

* Setting/{{_Target}}/EnvField

    What environment setting will contain the Response.
    
    By default, this will be a name similar to *target*Response. For the
    Response setting, however, this is mapped to "Response".

* Setting/{{_Target}}/TemplateResponseMap

    What parts of the Response object will be treated as a template, and what
    environment setting will hold the results. This is a map from the template
    name to the environment name. By default, this maps from "Template" to
    the name of the target, however for the Response object, this maps from
    "Template" to "Msg".

### Sending

#### Message

Environment settings:

* Msg/Ssml
* Msg/Text
* Suffix/Ssml
* Suffix/Text

#### Suggestion chips

Environment settings:

* Msg/Suggestions

    An array of strings. Each string becomes a suggestion chip text.
    
* Suffix/Suggestions

    If `Msg/Suggestions` is not set, this array of strings will be used instead.

#### Lists, Options, and Cards

Environment settings to generate a list or a card:

* Msg/Option/Type

    Should be either "list" or "carousel". The value "collection" is equivalent
    to "carousel" for AoG v3.
    
* Msg/Option/Title

* Msg/Option/Items

    There must be at least 2 items. (If not, this gets turned into a card.)

    * Msg/Options/Items[]/Title

    * Msg/Options/Items[]/Body

    * Msg/Options/Items[]/ImageUrl

    * Msg/Options/Items[]/ImageText
    
    * Msg/Options/Items[]/ImageBorder
        (for Card only)
        If set, should be one of: "DEFAULT", "WHITE", "CROPPED"
    
    * Msg/Option/Items[]/Footer
        (for Browsing Carousel only)
    
    * Msg/Options/Items[]/Url
        (for Browsing Carousel and Card only)

When processing the option result:

* Option
    Set with the index of the result. 

##### AoG v3 implementation

AoG v3 uses a Session Type to organize the possible responses. You must define the
Type in the Builder/SDK. By default, this type is `MultivocalOption`, but you
can change this in the settings in `Settings/Option/TypeName`.

You must have a Slot for your Scene of this Type, and the prompt for this
slot should be what sends the list or collection. The slot should be named
`multivocalOption`, unless you change the path in `Settings/Option/Path`.

#### Table

Environment settings:

* Msg/Table/Title

* Msg/Table/ImageUrl

* Msg/Table/ImageText

* Msg/Table/Headers

    This is an array containing the column headers.

* Msg/Table/Data

    This must be an array containing the rows in the table. Each row
    must be an array containing the cells (column by column) in that row.

#### Link out

(TODO: Link out suggestion - work in progress)

(TODO: Link out/to Android app prompt - work in progress)

#### Media

Environment settings:

* Msg/Audio/Url

* Msg/Audio/Offset

* Msg/Audio/Title

* Msg/Audio/Body

* Msg/Audio/IconUrl

* Msg/Audio/ImageUrl

* Setting/Media/Controls

#### Full Page Display

This supports the Actions on Google 
"[Interactive Canvas](https://developers.google.com/actions/interactivecanvas/)"
which allows Assistant devices with screens (such as Android and Smart
Displays) to display an HTML page that can receive updates as part of the
responses.

* Setting/Page/Url

    The URL that the full page is loaded from. There is no default.
    
* Setting/Page/IncludeEnvironment

    An array of Environment paths that are copied into the Data sent as
    part of the response. It defaults to
    
    * Intent
    * Action
    * Node
    * Outent
    * the Text and SSML included in the response

* Msg/Page/Data

    An object containing state information or updates for this response.
    By default, it may be empty.
    
    The final object Data will include the attributes specified by
    `Setting/Page/IncludeEnvironment` noted above.

* Msg/SuppressMic

    If true, the mic will be closed immediately, otherwise, left open as usual.

The Data will be sent if both of the following are true:

* The `Setting/Page/Url` is set
* The proper feature in `Session/Feature` is set by Actions on Google

#### Transitions or end of conversation

Usually these will be set as part of a response, and usually as part of
a Base response, although you can set them manually as well. 
They should not be part of a Template.

* ShouldClose
   For Dialogflow with Actions on Google or Actions Builder, setting
   this to true will close the Action after the response.

* NextNode
   For Actions Builder, if set, this is the name of the scene to transition to
   or special values (indicated below) indicating recent nodes to transition
   to.
   
##### Special transition values

Multivocal stores recent `NodeName`s in the `Session/Stack/NodeName` stack
and uses this to allow for "relative" names consisting of one or more periods
to indicate how far back in the stack should be returned to (and removing those
entries from the stack).

* `.` would transition to the same node. While this seems identical to not
    transitioning at all, Actions Builder would re-trigger the `onEntry`
    event if transitioned to, and would not otherwise.
* `..` would transition to the immediately previous node before calling this
    node.
* and so forth

### Voices

### Contexts

### User and Session Storage

### Requirements and Requests

Sometimes, responses need information that you will collect as part of your
conversation with the user. You need to make sure you have the information
in the environment before you give a result. 
Multivocal can help you out by letting you set a
*requirement* in the configuration for a response and automatically calling
a *requester* function which will set things up to get you the values you
need - typically by asking the user for this information. Some of the built-in
requesters use a system provided helper to get this information.

To indicate when you need a particular requirement to be met, you'll specify
that in the `Requirements` section for a locale, which is setup similarly to
the `Response` section. The key will be the Action/Intent/Default name, while
the value will either be a string of the requirement, or an array of strings
indicating all the required environment settings.

So to say that the "user.email" and "user.name" Intents require that the user
be authenticated, we might have this in our configuration:

```
  "Local": {
    "und": {
      "Requirements": {
        "Intent.user.email": "User/IsAuthenticated",
        "Intent.user.name":  "User/IsAuthenticated"
      }
    }
  }
```

#### Default requester changes to the environment

Adds two new settings:

* Requirements/RequestName
* Requirements/Request

Changes three settings. These are updated and prefixed with `Request.` and
the request name followed by another dot.

* Action
* Intent
* Default

Stores the following in the `multivocal_requirements` context so the
environment will be based on these when the requested value has been
set:

* action
* actionName
* intent
* intentName

#### Requesting user name

Request name: `Permission`

Requires: `User/Name`

#### Requesting location

Request name: `Permission`

Requires: `Session/Location`

#### Requesting authorization

Request name: `SignIn`

Requires: `User/IsAuthenticated`

#### Request surface feature

(TODO: work in progress)

#### Requesting place by name

(TODO: work in progress)

#### Adding your own requirements or changing built-in ones

`Mutlivocal.setRequirementsRequest( requirement, requesterFunction )`

Your request function should call `Multivocal.requestDefault( env, name, additionalParameters)`
at the end.

In most cases, you'll also want to create a Builder that will get the result
and make sure the environment is populated with the requirement.

### Counters, Stacks, and Intent/Action Levels

Multivocal will keep track of both how many times some events have happened,
and some information about recent events.

* Session/Counter

    How many times some events have happened during the session.

* Session/Consecutive

    How many times those same events tracked by `Session/Counter` have 
    happened in a row. When that event doesn't happen in the current round
    of a session, it is removed from the `Session/Consecutive` list (and,
    obviously, not incremented in the `Session/Counter`)

* Session/Stack

    For some events, the most recent non-consecutive values.

#### Counters set by the system

The system will increment the following Counters as part of the Default
handler, shortly before the Response is computed:

* the handler name, prefixed by 'Handler.'
* the Node
* the Action
* the Intent
* the Outent
* NumVisits

Additionally, the `User/State/NumVisits` environment value is incremented
as part of the `Action.welcome` handler by default

#### Adding your own counter

In your handler, you can add a counter name to the array at the `Counter`
environment path. The appropriate counters will be
incremented as part of the Default handler just before the Response is
computed.

Multivocal generally does something like

    Util.setObjPath( env, 'Counter[+]', counterName );
    
You can't check the `Counter` path to see
if the counter will be incremented since this may take place
after your Builder or Handler runs.
It is safe to add the name more than once - the counter will only be
incremented once per request.

#### Tracking recent information on the stack

The system keeps track of the N most recent changed values for the
following environment values set:

* the NodeName

The stack is implemented as an array with the most recent (ie - current) value
added in the 0th position during the default handler. If the current value
matches the value on the top of the stack, it is not added. If the stack is
greater than the maximum stack size, items are removed from the bottom of the
stack.

The stack is used by the system for handling relative transitions
with `NextNode`.

#### Levels and Responses

Levels are computed for the Action and Intent, and can be used to easily set
the responses for that Action/Intent and Level. For example, you can have one
set of responses for the first time the user gives a response, a different
set for the second time, and then a default set for subsequent responses. These
levels can be flexibly defined, so you can reply multiple times at one level,
depending how you define it.

The levels are defined in the environment at

* IntentLevel
* ActionLevel

When looking for responses to use, multivocal will append a period and the level
after the Intent or Action and search for this in the Response section. If it
doesn't find one with the level suffix, it looks for one without the suffix,
so these act as the default for any (or any undefined) level.

For example, if the level for the "example" action is 2, multivocal would 
look for results named `Action.example.2` and then for `Action.example`.

By default, the level for an Action or Intent is the value of the
`Session/Consecutive` counter for that Action or Intent. The standard
configuration for `Action.multivocal.welcome` defines two levels:

1. For the first visit for this user.
2. For visits 2-4 (inclusive) for this user.

#### Defining Levels for an Action/Intent

Config/Level

contains the rules for levels for an Action or Intent. Rules may either be
defined as a string, in which case it is evaluated as a template and the
result is assigned to the level, or as an array. Each element in the array
is evaluated, in order, as a boolean. The position of the first element that 
evaluates to `true` determines the value of the level. In this case, the
first rule, if matched, would be `1`, the second `2` and so forth. (This is
**not** the index of the array. It is one more than the index of the array.)

The level `0`, or an empty string, or undefined evaluates to "no level".

For example, consider this in the configuration:

```JSON
  {
    "Level": {
      "Action.multivocal.welcome": [
        "{{eq User.State.NumVisits 1}}",
        "{{lt User.State.NumVisits 5}}"
      ],
      "Action.example": "{{(User.State.NumVisits % 10) +  1}}"
    }
  }
```

If we're evaluating the "multivocal.welcome" Action, this says:

* If the number of user visits is 1, then the level is 1.
* Otherwise, if the number of user visits is less than 5, then the level
would be 2.
* Otherwise, no level is defined.

If we're evaluating the "example" Action, then the template is evaluated and
produces a level from 1 through 10 (inclusive). You can use this to force
rotate between responses each time. Note that we have to add 1, since 0
is "undefined". Levels evaluated this way do not need to be numbers.

You can also explicitly set the `IntentLevel` and/or `ActionLevel` in a builder.
If already set, multivocal will not try to evaluate it as part of the default
handler.

### Types

Dialogflow and Actions Builder support 
[Session Entities](https://cloud.google.com/dialogflow/docs/entities-session)
which allow you to change Entities to customize it for each user.

Environment setting:

* Types

    Contains an object with the attribute names being the names of the Types
    being defined and the value being an object containing the value names
    as the attribute and a string or array of strings as possible aliases for
    the value.
    
So the Types object might look something like

```json
{
  "shape": {
    "circle": ["oval","sphere"],
    "square": "rectangle"
  },
  "user-color": {
    "red": [],
    "purple": "lavender"
  }
}
```

(TODO: Support this for Dialogflow without AoG)

### Post-processing

(TODO: Work in progress)

#### Analytics

(Future work)

(TODO: Don't send Google's healthcheck ping for analytics)

## Questions

### Platforms

#### Does multivocal work with Firebase Cloud Functions?

Yes. In your index.js file, you would have something like

    exports.webhook = Multivocal.processFirebaseWebhook;
    
and your Dialogflow or Actions Builder webhook would be set to the URL that calls this.

#### Does multivocal work on Google Cloud Platform?

It depends. If you're using Google Cloud Functions, then your index.js
file would have a line

    exports.webhook = Multivocal.processGCFWebhook;
    
and your Dialogflow or Actions Builder webhook would be set to the URL that calls this.

If you're doing this some other way (using App Engine, Compute Engine,
or a Docker or Kubernetes image - any of which can run node.js), 
then it depends on what framework you're using to handle HTTPS requests.
We've tested with Express.js (see the next question).

#### Does multivocal work with Express.js?

Yes. You'll want to have your Express app listen for POST requests at
a particular route, and then send that to Multivocal for processing.

There are lots of ways to structure your code, but the routing part
of it might look something like this:

    app.post( '/webhook', Multivocal.processExpressWebhook );
    
and you should set your Dialogflow or Actions Builder webhook to the URL that would match
this route.

#### Does multivocal work with AWS Lambda?

Yes, you can use the `Multivocal.processLambdaWebhook` function and
have your Dialogflow or Actions Builder webhook fulfillment set to an AWS API Gateway.
 
#### Does multivocal work with Alexa?

Not currently, but this is on our long-term roadmap.

In theory, it shouldn't be **too** hard. In theory. The tasks involved
pretty much boil down to:

* Identifying the paths to use to get values for the environment builder.
* Creating a formatter to save things in the correct format.
* Finding a reasonable way to map Alexa concepts into the concepts
    we're using (such as figuring out how to handle contexts).
    
Some of these tasks are the same as what needs to be done for the
Actions SDK.

(Are you interested in helping?)

#### What version of Dialogflow does multivocal work with?

Right now, multivocal primarily targets Dialogflow version 2.

There is support for version 1 (it reports the version in the 
environment setting `Platform.DialogflowVersion` and there is a
JSON formatter that creates output for it), but this is no longer the
primary development target, so it may not be fully tested.
Besides, this version has been deprecated (and possibly shut off) by Google.

There is also *preliminary* support for Dialogflow version 3 (Dialogflow CX),
but since there are no default integrations and several gaps in the actual 
webhook support (many things need to be represented by ID rather than by name),
this is subject to change.

#### What integrations with Dialogflow are supported?

Dialogflow 2 integrations supported are
* Google Assistant (Actions on Google version 2)
* Hangouts Chat (also named Google Chat)

Dialogflow 3 does not have any integrations yet to support.

#### Does multivocal work with the Actions SDK or the Actions Builder?

Yes, the Actions SDK/Builder (Actions on Google version 3) is supported
starting with Multivocal 0.15.

The prior versions of the Actions SDK are not supported. Version 2 of Actions
on Google is supported only with Dialogflow.

### Use, Licensing, and Contributions

#### What license is multivocal under?

Apache 2.0

#### I've found a bug, how can I report it?

Open an issue at https://github.com/afirstenberg/multivocal/issues

#### I've got a fix for a bug or an improvement. How can I submit it?

Make sure you've opened an issue for it first (and maybe discussed it
with us), then submit the pull request at 
https://github.com/afirstenberg/multivocal/pulls.

Make sure you're ok with the license we'll be distirbuting it under.
