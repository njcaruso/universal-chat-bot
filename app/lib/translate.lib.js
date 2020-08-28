// translate.lib.js
// Translate payload from different sources to universal variables for use

/* jshint esversion: 8 */

const FILE_NAME = __filename + ': ';

class TranslateLib {
    translate(endpoint, payload, cbTranslate) {
        //console.log(FILE_NAME + 'Translating payload from ' + endpoint);

        var returnPayload = {
            text: '',
            user: '',
            channel: '',
            fromUser: ''
        };

        if (endpoint == 'slack') {

            returnPayload.text = payload.event.text;
            returnPayload.user = payload.event.user;
            returnPayload.channel = payload.event.channel;
            returnPayload.fromUser = (!payload.event.bot_profile) ? true : false;
            returnPayload.channelType = payload.event.channel_type;
            returnPayload.type = payload.event.type;

            return cbTranslate(null, returnPayload);

        } else if (endpoint == 'teams') {

            returnPayload.text = (payload.text) ? payload.text : "";
            returnPayload.user = payload.from.id;
            returnPayload.channel = payload.channelId;
            returnPayload.fromUser = (payload.from.role != 'bot') ? true : false; // Could be a problem when not in emulator, yet to be seen

            return cbTranslate(null, returnPayload);

        } else {
            return cbTranslate(new Error(FILE_NAME + 'Endpoint not recognized'));
        }
    }
}

module.exports = new TranslateLib();