// db.js
// Connection to MongoDB

/* jshint esversion: 8 */

const MongoClient = require('mongodb').MongoClient;
const path = require('path');

const DATABASE_NAME = 'testDB';
const FILE_NAME = __filename + ': ';

const ENV_FILE = path.join(__dirname, '..\\.env');
require('dotenv').config({ path: ENV_FILE });

let mongo_url = `mongodb+srv://main_user:${ process.env.MONGO_PASSWORD }@career-place-test-clust.u796u.mongodb.net/${ DATABASE_NAME }?retryWrites=true&w=majority`;

class DB {
    start(cbStart) {
        console.log(FILE_NAME + 'Starting DB connection');

        const mongo_client = new MongoClient(mongo_url, { useUnifiedTopology: true });

        mongo_client.connect().then((dbConnection) => {
            var dbo = mongo_client.db(DATABASE_NAME);
            console.log(FILE_NAME + 'Database connection successfully initialized');
            return cbStart(null, dbo);
        }, (errConnect) => {
            console.error(FILE_NAME + 'Error connecting to database, errConnect = ' + errConnect);
            return cbStart(errConnect);
        });
    }
}

module.exports = new DB();