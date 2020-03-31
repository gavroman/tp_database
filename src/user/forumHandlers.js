const Error = require('../libs/errors.js');

module.exports = class forumHandlers {
    constructor(db) {
        this.db = db;
    }

    createForum = (req, res) => {
        console.log('createForum');
        res.status(404).end();
    };

    createForumThread = (req, res) => {
        console.log('createForumThread');
        res.status(404).end();
    };

    getForumDetails = (req, res) => {
        console.log('getForumDetails');
        res.status(404).end();
    };

    getForumThreads = (req, res) => {
        console.log('getForumThreads');
        res.status(404).end();
    };

    getForumUsers = (req, res) => {
        console.log('fetForumUsers');
        res.status(404);
    };
};
