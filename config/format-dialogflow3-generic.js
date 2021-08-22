module.exports = {
  extends: "dialogflow3-base",
  criteria: {
    Terms: [
      "{{eq Platform.DialogflowVersion '3'}}",
      "{{eq Platform.DialogflowIntegration 'generic'}}"
    ],
    Op: "and"
  },
  tasks: {
  }
};