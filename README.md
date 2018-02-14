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
   Functions and anything running express.js.

## Features

### Naming Convention

Although there are some exceptions, multivocal reserves the following naming
conventions as things that will be defined for the library. These names are
found in the configuration object, in properties in objects, and in Dialogflow
configuration. You should not use them for forward compatibility purposes:

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

### Handlers

#### Built-in handlers

##### Default handler

#### Adding your own handler and setting an Outent

### Response, Suffix, Localization, and Templates

#### Conditions

### Sending

#### Message

#### Cards

#### Suggestion chips

(Work in progress)

#### Lists and Options

(Work in progress)

### Voices

### Contexts

### User and Session Storage

### Requirements and Requests

(Request surface feature - work in progress)

(Authorization - work in progress)

(Adding own requirements - work in progress)

### Counters

(Work in progress)

## Questions

### Does multivocal work on Google Cloud Platform?

### Does multivocal work with Express.js?

### Does multivocal work with AWS Lambda?
 
### Does multivocal work with Alexa?

### What version of Dialogflow does multivocal work with?

### Does multivocal work with the Action SDK?