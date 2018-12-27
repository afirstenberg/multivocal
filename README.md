# multivocal
A node.js library to assist with building best practice, configuration driven, 
Actions for the Google Assistant.

*(This README is a work in progress, although it documents much of
the platform, there are gaps. The intent is to have it completed
by version 1.0.0.)*

## What is multivocal?

Multivocal is a library that tries to bring a new approach to helping
you write webhooks for the Google Assistant (and, hopefully someday,
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

We think it makes sense for any application you're writing with
Dialogflow for the Google Assistant (Actions-on-Google). We hope to
expand this so it make sense to use for the Action SDK (without
Dialogflow), for other platforms that use Dialogflow, and for the
Amazon Alexa.

Right now, it targets webhooks that run on the Firebase Cloud Functions
platform, but it should work on any platform that uses Express-like
handling.

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

* MediaStatus

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

User actions in Dialogflow are represented by two things: The Intent
name and the Action name. Multivocal uses these to determine which
handler should be called to do any additional processing and what
should be sent in response. Multivocal prefixes these with "Intent."
and "Action." respectively and stores them in the following environment
values:

* ActionName
    The action name provided from Dialogflow
* Action
    The action name prefixed with "Action."
* IntentName
    The intent name provided from Dialogflow
* Intent
    The Intent name prefixed with "Intent."

Additionally, Multivocal defines the concept of an "Outent". You can
set this environment setting in a handler to provide additional
choices for responses which may be different than the default ones you
provide for the intent or action. You do not need to prefix it with
"Outent.", although you're allowed to do so. You're not required to set
one at all, if if you do, it should be in the environment setting:

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

#### Conditions

#### Base responses

Response settings:

* Base/Ref

* Base/Set

* Base/Condition

#### Template functions

#### Template special environment settings

* _This

* _Result

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

#### Lists, Options, and Cards

Environment settings:

* Msg/Option/Type

    Should be either "list" or "carousel".
    
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

* Msg/Audio/Title

* Msg/Audio/Body

* Msg/Audio/IconUrl

* Msg/Audio/ImageUrl

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
    
and your Dialogflow webhook would be set to the URL that calls this.

#### Does multivocal work on Google Cloud Platform?

It depends. If you're using Google Cloud Functions, then your index.js
file would have a line

    exports.webhook = Multivocal.processGCFWebhook;
    
and your Dialogflow webhook would be set to the URL that calls this.

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
    
and you should set your Dialogflow webhook to the URL that would match
this route.

#### Does multivocal work with AWS Lambda?

Yes, you can use the `Multivocal.processLambdaWebhook` function and
have your Dialogflow webhook fulfillment set to an AWS API Gateway.
 
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

Right now, multivocal primarily targets Dialogflow version 1.

There is support for version 2 (it reports the version in the 
environment setting `Platform.DialogflowVersion` and there is a
JSON formatter that creates output for it), but this isn't the
primary development target, so it may not have been as fully tested.

#### Does multivocal work with the Action SDK?

Not yet, but we would like to get support by version 1.0

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
