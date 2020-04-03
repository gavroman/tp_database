const Error = require('../libs/errors.js');
module.exports = class serviceHandlers {
    constructor(db) {
        this.db = db;
    }

    clearAllData = async (req, res) => {
        const deleteQuery = 'DELETE FROM $1';
        try {
            const result = {};
            await Promise.all([
                this.db.query('DELETE FROM votes'),
                this.db.query('DELETE FROM posts'),
                this.db.query('DELETE FROM users'),
                this.db.query('DELETE FROM threads'),
                this.db.query('DELETE FROM forums'),
            ]);
            res.status(200).send(result);
        } catch (err) {
            console.log(err);
            res.status(500).send(err);
        }
    };

    getInfo = async (req, res) => {
        const countUsersQuery = 'SELECT count(id) FROM users';
        const countPostsQuery = 'SELECT count(id) FROM posts';
        const countForumsQuery = 'SELECT count(id) FROM forums';
        const countThreadsQuery = 'SELECT count(id) FROM threads';
        try {
            const result = {};
            await Promise.all([
                this.db.query({text: countUsersQuery}).then(data => result.user = Number(data.rows[0].count)),
                this.db.query({text: countPostsQuery}).then(data => result.post = Number(data.rows[0].count)),
                this.db.query({text: countForumsQuery}).then(data => result.forum = Number(data.rows[0].count)),
                this.db.query({text: countThreadsQuery}).then(data => result.thread = Number(data.rows[0].count)),
            ]);
            res.status(200).send(result);
        } catch (err) {
            console.log(err);
            res.status(500).send(err);
        }
    };
};