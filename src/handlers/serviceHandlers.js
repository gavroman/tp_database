const Error = require('../libs/errors.js');
module.exports = class serviceHandlers {
    constructor(db) {
        this.db = db;
    }

    clearAllData = async (req, res) => {
        try {
            await this.db.query('TRUNCATE TABLE users, forums, forumUsers, threads, posts, votes CASCADE');
            res.status(200).send({});
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

    analyze = () => {
        this.db.query('ANALYZE');
    }
};
