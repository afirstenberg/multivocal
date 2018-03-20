# multivocal
A node.js library to assist with building best practice, configuration driven, Actions for the Google Assistant.

## Why multivocal?

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

const functions = require('firebase-functions');
exports.webhook = functions.https.onRequest( (req,res) => {
    Multivocal.process( req, res );
});
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
   
    This uses the Firebase Cloud Functions registration method to declare the
    function, but anything that can pass an express-like `req` and `res` object
    to `Multivocal.process()` will work fine. (These include Google Cloud
    Functions and anything running express.js.)

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

#### Simple JSON configuration

#### Firebase realtime database configuration

(TODO: Firebase DB integration - Work in progress)

#### Merged configuration

#### Default and Standard configurations

### Processing, the Environment, and Paths

#### Platform detection

### Environment builders

Environment settings built:

* Platform

* Locale

* Lang

* Parameter

* Context

* User/State

* Session/State

* Session/Counter

* Session/Consecutive

* Option

* MediaStatus

* Session/Feature

* User/Feature

* Intent

* IntentName

* Action

* ActionName

* Default

#### Adding your own builder

### Intents and Actions

#### Standard Dialogflow Intents/Actions

(TODO: Work in progress to provide Dialogflow zip)

##### Action: welcome and multivocal.welcome

Increments the `User/State/NumVisits` environment value.

##### Action: quit and multivocal.quit

Sets the `Response/ShouldQuit` environment setting to true
after doing response processing.

##### Intent: input.none

##### Intent: input.unknown

##### Action: input.unknown

##### Action: repeat and multivocal.repeat

Sets the `Response/ShouldRepeat` environment setting to true
after doing response processing.

### Handlers

#### Built-in handlers

##### Default handler

#### Adding your own handler and setting an Outent

### Response, Suffix, Localization, and Templates

#### Conditions

#### Base responses

Response settings:

* Base/Ref

* Base/Set

* Base/Condition

### Sending

#### Message

Environment settings:

* Msg/Ssml
* Msg/Text
* Suffix/Ssml
* Suffix/Text

#### Cards

#### Suggestion chips

#### Lists and Options

Environment settings:

* Msg/Option/Type

    Should be either "list" or "carousel".
    
* Msg/Option/Title

* Msg/Option/Items

    There must be at least 2 items. (TODO: Enforce or adapt this.)

    * Msg/Options/Items[]/Title

    * Msg/Options/Items[]/Body

    * Msg/Options/Items[]/ImageUrl

    * Msg/Options/Items[]/ImageText
    
    * Msg/Option/Items[]/Footer
        (for Browsing Carousel only)
    
    * Msg/Options/Items[]/Url
        (for Browsing Carousel only)

#### Link out

(TODO: Link out suggestion - work in progress)

(TODO: Link out/to Android app prompt - work in progress)

#### Media

Environment settings:

* Audio/Url

* Audio/Title

* Audio/Body

* Audio/IconUrl

* Audio/ImageUrl

### Voices

### Contexts

### User and Session Storage

### Requirements and Requests

(TODO: Request surface feature - work in progress)

(TODO: Requesting place by name - work in progress)

(TODO: Authorization - work in progress)

(TODO: Adding own requirements - work in progress)

### Counters

Session/Counter

Session/Consecutive

#### Counters set by the system

The system will increment the following Counters as part of the Default
handler, just before the Response is computed:

* the handler name, prefixed by 'Handler.'
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

### Analytics

(Future work)

## Questions

### Does multivocal work on Google Cloud Platform?

### Does multivocal work with Express.js?

### Does multivocal work with AWS Lambda?
 
### Does multivocal work with Alexa?

### What version of Dialogflow does multivocal work with?

Right now, multivocal primarily targets Dialogflow version 1.

There is support for version 2 (it reports the version in the 
environment setting `Platform.DialogflowVersion` and there is a
JSON formatter that creates output for it), but this isn't the
primary development target, so it may not have been as fully tested.

### Does multivocal work with the Action SDK?