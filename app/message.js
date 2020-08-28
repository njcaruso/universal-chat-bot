// message.js
// Helper functiosn for sending messages to Slack 

// TODO: USE THIS FILE TO SEND MESSAGES TO TEAMS AS WELL

/* jshint esversion: 8 */

const FILE_NAME = __filename + ": ";

const request = require('request');

function createAndSend(payload, msg) {
    sendMessage(createMessage(payload, msg));
}

function createMessage(payload, msg) {
  return {
    token: process.env.BOT_TOKEN,
    text: msg,
    channel: payload.channel
  };
}

function sendMessage(msg) {
  let options = {
    'method': 'POST',
    'url': 'https://slack.com/api/chat.postMessage?token=' + msg.token + '&channel=' + msg.channel + '&text=' + msg.text,
    'headers': {
      'Content-Type': 'application/json'
    },
    body: msg
  };

  request.post(options.url, () => {
    console.log(FILE_NAME + "Message posted in channel: " + options.body.channel);
  });
}

module.exports = {
    createAndSend
};