# multivocal
A node.js library to assist with building best practice, configuration driven, Actions for the Google Assistant.

## Why multivocal?

## Hello World

Using multivocal to implement a basic fulfillment webhook for a Dialogflow
based action built on Firebase Cloud Functions is straightforward with just
a little boilerplate.

```javascript
const Config = require('multivocal/lib/config-simple')({
  Local: {
    und: {
      Response: {
        Default: [
          {
            Template: "Hello World.",
            ShouldClose: true
          }
        ]
      }
    }
  }
});

const Multivocal = require('multivocal');
Multivocal.setConfig( Config );

const functions = require('firebase-functions');
exports.webhook = functions.https.onRequest( (req,res) => {
    Multivocal.process( req, res );
});
```

We can roughly break this into three parts:

1. Build our configuration.  
   
   We'll use a simple configuration object that takes the JSON for the configuration.
   
   We need to define the _Default_ response, and we'll define it for the _undefined_
   locale. This response says that for any incoming request that does not match
   another defined Intent or Action, format the Template and use this as our message.
   Furthermore, after we send this message, we should close the conversation.
   
   Since no other responses are defined for any other Intent or Action, in any
   other locale, this will be the one called.
   
2. Load the multivocal library and set the configuration.

3. Register the function to be called when a request comes in from Dialogflow
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

(Work in progress)

### Processing, the Environment, and Paths

#### Platform detection

(Work in progress)

### Environment builders

#### Adding your own builder

### Intents and Actions

#### Standard Dialogflow Intents/Actions

(Work in progress to rename these and provide Dialogflow zip)

##### Action: welcome

##### Action: quit

##### Intent: input.none

##### Intent: input.unknown

(Work in progress)

##### Action: repeat

(Work in progress)

### Handlers

#### Built-in handlers

##### Default handler

#### Adding your own handler and setting an Outent

### Response, Suffix, Localization, and Templates

#### Conditions

#### Base responses

Base/Ref

Base/Set

Base/Condition

### Sending

#### Message

#### Cards

#### Suggestion chips

#### Lists and Options

#### Link out

(Link out suggestion - work in progress)

(Link out/to Android app prompt - work in progress)

### Voices

### Contexts

### User and Session Storage

### Requirements and Requests

(Request surface feature - work in progress)

(Requesting place by name - work in progress)

(Authorization - work in progress)

(Adding own requirements - work in progress)

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

### Does multivocal work with the Action SDK?