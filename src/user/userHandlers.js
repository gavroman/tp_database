const Error = require('../libs/errors.js');

module.exports = class UserHandlers {
    constructor(db) {
        this.db = db;
    }

    createUser = (req, res) => {
        const body = req.body;
        const nickname = req.params.nickname;
        const query = 'INSERT INTO USERS (nickname, fullname, email, about) VALUES ($1, $2, $3, $4);';
        this.db.query({text: query, values: [nickname, body.fullname, body.email, body.about]})
            .then(() => {
                body.nickname = nickname;
                res.status(201).send(body);
            })
            .catch((err) => {
                if (err.code === '23505') {
                    const query = 'SELECT nickname, email, fullname, about ' +
                        'FROM users WHERE nickname = $1 or email = $2;';
                    this.db.query({text: query, values: [nickname, body.email]})
                        .then((queryResult) => {
                            res.status(409).send(queryResult.rows);
                        });
                } else {
                    res.status(500);
                }
            });
    };

    getUser = (req, res) => {
        const nickname = req.params.nickname;
        const query = 'SELECT nickname, email, fullname, about FROM users WHERE nickname = $1';
        this.db.query({text: query, values: [req.params.nickname]})
            .then((queryResult) => {
                if (queryResult.rows.length === 0) {
                    res.status(404).send(new Error('No users found'));
                } else {
                    res.status(200).send(queryResult.rows[0]);
                }
            })
            .catch(err => console.log(err));
    };

    updateUser = (req, res) => {
        const nickname = req.params.nickname;
        let body = req.body;
        let query = 'SELECT nickname, email, fullname, about FROM users WHERE nickname = $1';
        this.db.query({text: query, values: [req.params.nickname]})
            .then((queryResult) => {
                if (queryResult.rows.length === 0) {
                    res.status(404).send(new Error('No user found'));
                } else {
                    body.email = body.email || queryResult.rows[0].email;
                    body.fullname = body.fullname || queryResult.rows[0].fullname;
                    body.about = body.about || queryResult.rows[0].about;
                    query = 'UPDATE USERS SET fullname = $1, email = $2, about = $3 WHERE nickname = $4;';
                    this.db.query({text: query, values: [body.fullname, body.email, body.about, nickname]})
                        .then(() => {
                            body.nickname = nickname;
                            res.status(200).send(body);
                        })
                        .catch((err) => {
                            if (err.code === '23505') { // conflict
                                res.status(409).send(new Error('Update data conflict email'));
                            } else {
                                res.status(500);
                            }
                            console.log(err)
                        });
                }
            })
            .catch(err => console.log(err));
    };
};
