# Alexa

Alexa support is still pretty new, and somewhat incomplete.

In theory, it shouldn't be **too** hard. In theory. The tasks involved
pretty much boil down to:

* Identifying the paths to use to get values for the environment builder.
* Creating a formatter to save things in the correct format.
* Finding a reasonable way to map Alexa concepts into the concepts
  we're using such as
  * Actions
  * Contexts

Some of these tasks are the same as what needs to be done for the
Actions SDK.

And then, adding support for Alexa specific features such as:
* APL
* APL-A

## Actions

(TODO: Document)

In most cases, the `Action` will be determined based on the `Setting/Action/FromIntent/Global`
table, or a similar table named after the current value of `Node`. But these
are unset by default.

### Alexa Conversations

See TODO section

## To-do

### Ping

At least for Alexa-hosted skills, Alexa does run [skill availability
tests](https://developer.amazon.com/en-US/docs/alexa/hosted-skills/alexa-hosted-skills-create.html#filter-checks)
which should be included in the ping pre-processors.

### User

Can get the ID from `Body/session/user/userId`, but we need to load the rest of
the user info from a database (and save user state there afterwards).

### Alexa Conversations and Action name

Alexa Conversations can "invoke" a handler with a request type of "Dialog.API.Invoked"
and additional information. This might be suitable as an `Action`. See
[documentation](https://developer.amazon.com/en-US/docs/alexa/conversations/handle-api-calls.html)
for more about Conversations and consider adding this to the evaluation path.

### APL document and data binding

### APL-A