const express = require('express');
const {Client} = require('pg');

const app = express();
app.use(express.json()); // for parsing application/json


const db = new Client({
    host: 'localhost',
    port: 5432,
    user: 'tp_bd_user',
    database: 'tp_bd',
    password: 'bazulika',
});

db.connect()
    .then(() => console.log('db connected'))
    .catch(err => console.error('connection error', err.stack));

const port = 5000;
app.listen(port, () => {
    console.log('Listening on port', port);
});

module.exports = {app, db};