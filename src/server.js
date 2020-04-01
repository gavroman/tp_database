const fs = require('fs');
const {Client} = require('pg');
const express = require('express');

const db = new Client({
    host: 'localhost',
    port: 5432,
    user: 'tp_bd_user',
    database: 'tp_bd',
    password: 'bazulika',
});

const sqlInitQueries = fs.readFileSync('./init.sql').toString();
db.connect()
    .then(() => {
        console.log('Database connected');
        db.query({text: sqlInitQueries})
            .then(() => console.log('Database inited'))
            .catch(err => console.error('Initialization error', err.stack));
    })
    .catch(err => console.error('Connection error', err.stack));

const app = express();
app.use(express.json()); // for parsing application/json

const port = 5000;
app.listen(port, () => {
    console.log('Listening on port', port);
});

module.exports = {app, db};