const Error = require('../libs/errors.js');

module.exports = class UserHandlers {
    constructor(db) {
        this.db = db;
    }

    createUser = async (req, res) => {
        const body = req.body;
        const nickname = req.params.nickname;
        const query = 'INSERT INTO USERS (nickname, fullname, email, about) VALUES ($1, $2, $3, $4);';

        try {
            await this.db.query({text: query, values: [nickname, body.fullname, body.email, body.about]});
            body.nickname = nickname;
            res.status(201).send(body);
        } catch (err) {
            if (err.code === '23505') {
                const query = 'SELECT nickname, email, fullname, about FROM users WHERE nickname = $1 or email = $2;';
                try {
                    const queryResult = await this.db.query({text: query, values: [nickname, body.email]});
                    res.status(409).send(queryResult.rows);
                } catch (err) {
                    res.status(500).send(err);
                }
            } else {
                res.status(500).send(err);
            }
        }
    };

    getUser = async (req, res) => {
        const nickname = req.params.nickname;
        const query = 'SELECT nickname, email, fullname, about FROM users WHERE nickname = $1';

        try {
            let queryResult = await this.db.query({text: query, values: [nickname]});
            if (queryResult.rows.length === 0) {
                res.status(404).send(new Error('No users found'));
            } else {
                res.status(200).send(queryResult.rows[0]);
            }
        } catch (err) {
            res.status(500).send(err);
        }
    };

    updateUser = async (req, res) => {
        const nickname = req.params.nickname;
        let body = req.body;
        let query = 'SELECT nickname, email, fullname, about FROM users WHERE nickname = $1';

        try {
            const queryResult = await this.db.query({text: query, values: [req.params.nickname]});
            if (queryResult.rows.length === 0) {
                res.status(404).send(new Error('No user found'));
            } else {
                body.email = body.email || queryResult.rows[0].email;
                body.about = body.about || queryResult.rows[0].about;
                body.fullname = body.fullname || queryResult.rows[0].fullname;
                query = 'UPDATE USERS SET fullname = $1, email = $2, about = $3 WHERE nickname = $4;';
                try {
                    await this.db.query({text: query, values: [body.fullname, body.email, body.about, nickname]});
                    body.nickname = nickname;
                    res.status(200).send(body);
                } catch (err) {
                    if (err.code === '23505') { // conflict
                        res.status(409).send(new Error('Update data conflict email'));
                    } else {
                        res.status(500).send(err);
                    }
                }
            }
        } catch (err) {
            res.status(500).send(err);
        }
    };
};
