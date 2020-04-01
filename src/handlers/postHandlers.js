const Error = require('../libs/errors.js');

module.exports = class postHandlers {
    constructor(db) {
        this.db = db;
    }

    updatePost = async (req, res) => {
        console.log('updatePost');
        res.status(404).send('Пока не сделано');
    };

    getPosts = async (req, res) => {
        console.log('getPosts');
        res.status(404).send('Пока не сделано');
    };
};