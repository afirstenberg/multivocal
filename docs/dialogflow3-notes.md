# Dialogflow 3 (Dialogflow CX)

## Verification

Dialogflow sends a 
[service identity token](https://cloud.google.com/dialogflow/cx/docs/concept/webhook#id-token) 
in the HTTP "Authorization" header. The documentation references that this should be a 
[Google identity token](https://developers.google.com/identity/sign-in/web/backend-auth#verify-the-integrity-of-the-id-token),
however, it differs from the documented format in two significant ways:

* The "aud" field does not contain one of the client IDs. Instead, it contains
    the endpoint of the webhook.
* The "email" field contains an email address that includes the client ID.

The JWT validator does not try to validate the "email" field, but instead has
the webhook endpoint as one of the valid "aud" fields. If this doesn't match
for some reason, you may need to add it yourself in `Config/Setting/JWTAuth/Google/aud`.

## Locale

Dialogflow sends the language/locale information in a `languageCode` field in
the body, however this may either specify a language (without locale), or a 
language and locale where the locale is in lowercase letters.

In the latter case, Multivocal normalizes this to use uppercase letters.
