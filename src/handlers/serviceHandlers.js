const Error = require('../libs/errors.js');
module.exports = class serviceHandlers {
    constructor(db) {
        this.db = db;
    }

    clearAllData = async (req, res) => {
        console.log('clearAllData');
        res.status(404).send('Пока не сделано');
    };

    getInfo = async (req, res) => {
        console.log('getInfo');
        res.status(404).send('Пока не сделано');
    };
};