// webserver.js
// Launches webserver for each endpoint of the chat bots

/* jshint esversion: 8 */

// ------------------- SET UP ------------------- //

const FILE_NAME = __filename + ': ';
const PORT = 3000;

const express = require('express');
const app = express();
app.use(express.json());

const path = require('path');

const translate = require('./lib/translate.lib');
const routes = require('./routes/customers.route');

const ENV_FILE = path.join(__dirname, '.env');
require('dotenv').config({ path: ENV_FILE });

// ------------------- TEAMS ADAPATER SET UP ------------------- //

const { BotFrameworkAdapter } = require('botbuilder');

const adapter = new BotFrameworkAdapter({
    appId: process.env.MicrosoftAppId,
    appPassword: process.env.MicrosoftAppPassword,
    channelService: process.env.ChannelService,
    openIdMetadata: process.env.BotOpenIdMetadata
});

const onTurnErrorHandler = async (context, error) => {
    // This check writes out errors to console log .vs. app insights.
    // NOTE: In production environment, you should consider logging this to Azure
    //       application insights.
    console.error(`\n [onTurnError] unhandled error: ${ error }`);

    // Send a trace activity, which will be displayed in Bot Framework Emulator
    await context.sendTraceActivity(
        'OnTurnError Trace',
        `${ error }`,
        'https://www.botframework.com/schemas/error',
        'TurnError'
    );

    // Send a message to the user
    await context.sendActivity('The bot encountered an error or bug.');
    await context.sendActivity('To continue to run this bot, please fix the bot source code.');
};

adapter.onTurnError = onTurnErrorHandler;

// ------------------- WEBSERVER CLASS ------------------- //

class Webserver {
    start(dbo, cbStart) {
        console.log(FILE_NAME + 'Starting listening on webserver');
        this.dbo = dbo;

        const customerCollection = this.dbo.collection('customers');

        this.initSlack(customerCollection);

        this.initTeams(customerCollection);

        app.listen(PORT, () => {
            console.log(FILE_NAME + 'Listening on http://localhost:' + PORT);
            return cbStart();
        });
    }

    initSlack(collection) {
        //const $this = this;
        app.post('/slack/events', async (req, res) => {

            // Take care of Events API verification only when trying to verify
            if (req.body.type == 'url_verification') {
                res.status(200).json({ challenge: req.body.challenge });
            }

            let payload;

            translate.translate('slack', req.body, (err, resp) => {
                if (err) { console.log("err = ", err); }
                
                payload = resp;
            });

            // First check if this message is coming from someone other than the bot
            if (payload.fromUser) {

                // Then check if the message is an IM and in the format of message
                if (payload.channelType == 'im' && payload.type == 'message') {
                    //const customerCollection = $this.dbo.collection('customers');

                    // TODO: CHANGE TO ACCEPT A VARIABLE OF WHERE ITS COMING FROM (SLACK OR TEAMS)
                    await routes.orderPizza(payload, 'slack', collection, res);
                }
            }
        });
    }

    initTeams(collection) {
        app.post('/api/messages', async (req, res) => {
            console.log(FILE_NAME + 'POST request from /api/messages');

            let payload;

            translate.translate('teams', req.body, (err, resp) => {
                if (err) { console.log("err = ", err); }
                payload = resp;
            });

            adapter.processActivity(req, res, async (context) => {
                console.log(FILE_NAME + 'Processing activity from teams');

                await routes.orderPizza(payload, 'teams', collection, res, context);

                //await context.sendActivity("Hello world");
            });
        });
    }
}

module.exports = new Webserver();