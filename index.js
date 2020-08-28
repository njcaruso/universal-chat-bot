// index.js
// Set up required packages and start database and webserver connections

/* jshint esversion: 8 */

const path = require('path');

const express = require('express');
const app = express();
app.use(express.json());

const db = require('./app/db');
const webserver = require('./app/webserver');

const FILE_NAME = __filename + ': ';

console.log(FILE_NAME + 'Launching DB connection');
db.start((errConnect, dbo) => {
    if (errConnect) {
        console.error(FILE_NAME + "errConnect = " + errConnect);
        return;
    }
    console.log(FILE_NAME + 'Launching webserver');
    webserver.start(dbo, () => {

    });
});