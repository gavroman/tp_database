const Error = require('../libs/errors.js');

module.exports = class forumHandlers {
    constructor(db) {
        this.db = db;
    }

    createForum = async (req, res) => {
        const body = req.body;

        const queryInsert = `INSERT INTO forums (slug, title, userID)
                             VALUES ($1, $2, (
                                 SELECT id
                                 FROM users
                                 WHERE nickname = $3
                             ))
                             RETURNING slug, title, (SELECT nickname FROM users WHERE id = userID LIMIT 1) AS "user";`;

        try {
            const result = await this.db.query({text: queryInsert, values: [body.slug, body.title, body.user]});
            if (result.rows) {
                res.status(201).send(result.rows[0]);
            }
        } catch (err) {
            switch (err.code) {
                case '23505':
                    const query = `SELECT slug, title, nickname
                                   FROM forums f
                                            JOIN users u ON (u.id = f.userID) AND (u.nickname = $1)
                                   LIMIT 1;`;

                    try {
                        const queryResult = await this.db.query({text: query, values: [body.user]});
                        queryResult.rows[0].user = body.user;
                        res.status(409).send(queryResult.rows[0]);
                    } catch (err) {
                        res.status(500).send(err);
                    }
                    break;
                case '23502':
                    res.status(404).send(new Error('Can\'t find user', body.user));
                    break;
                default:
                    res.status(500).send(err);
            }
        }
    };

    createForumThread = async (req, res) => {
        const forumSlug = req.params.slug;
        const body = req.body;

        const threadSlug = (body.slug) ? `'${body.slug}', ` : '';
        const threadSlugColumn = (threadSlug !== '') ? 'slug, ' : '';
        const insertQuery = `INSERT INTO threads (userID, created, forumID, message, ${threadSlugColumn} title, votes)
                             VALUES ((SELECT ID FROM users WHERE nickname = $1),
                               $2,
                               (SELECT ID FROM forums WHERE slug = $3),
                               $4, ${threadSlug} $5, $6)
                             RETURNING id, created, message, slug, title,
                                    (SELECT nickname FROM users WHERE id = userID LIMIT 1) AS author,
                                    (SELECT slug FROM forums WHERE id = forumID LIMIT 1) AS forum;`;
        const values = [
            body.author,
            body.created,
            forumSlug,
            body.message,
            body.title,
            body.votes || 0,
        ];
        try {
            const insertResult = await this.db.query({text: insertQuery, values: values});
            if (insertResult.rows) {
                res.status(201).send(insertResult.rows[0]);
            }
        } catch (err) {
            switch (err.code) {
                case '23505':
                    const query = `SELECT u.nickname AS author, created, f.slug AS forum, t.id, message, t.slug AS slug, t.title
                               FROM threads t
                                        JOIN forums f ON (t.forumID = f.ID) AND (t.slug = ${threadSlug.slice(0, -2)}) 
                                        JOIN users u ON t.userID = u.ID LIMIT 1;`;
                    try {
                        const queryResult = await this.db.query({text: query});
                        res.status(409).send(queryResult.rows[0]);
                    } catch (err) {
                        res.status(500).send(err);
                    }
                    break;
                case '23502':
                    res.status(404).send(new Error('User not found'));
                    break;
                default:
                    console.log(err);
                    res.status(500).send(err);
            }
        }
    };

    getForumDetails = async (req, res) => {
        const slug = req.params.slug;

        const query = `SELECT posts, threads, slug, title, nickname as "user"
                       FROM forums f
                                JOIN users u ON (u.id = f.userID) AND (slug = $1)
                       LIMIT 1`;
        try {
            const queryResult = await this.db.query({text: query, values: [slug]});
            if (queryResult.rows.length === 1) {
                res.status(200).send(queryResult.rows[0]);
            } else {
                res.status(404).send(new Error('No such forum'));
            }
        } catch (err) {
            res.status(500).end();
        }
    };

    getForumThreads = async (req, res) => {
        const forumSlug = req.params.slug;
        const limit = (req.query.limit) ? `LIMIT ${req.query.limit}` : '';
        let order = 'ORDER BY t.created';
        let sign = '>=';
        if (req.query.desc !== undefined && req.query.desc.toUpperCase() === 'TRUE') {
            order = 'ORDER BY t.created DESC';
            sign = '<=';
        }
        const since = (req.query.since) ? `AND t.created ${sign} '${req.query.since}'` : '';

        const checkForumQuery = `SELECT ID
                                 FROM forums
                                 WHERE slug = $1;`;
        try {
            const queryResult = await this.db.query({text: checkForumQuery, values: [forumSlug]});
            if (queryResult.rows.length === 0) {
                res.status(404).send(new Error('Forum not found'));
                return;
            }
        } catch (err) {
            req.status(500).send(err);
            return;
        }

        const query = `SELECT u.nickname AS author,
                              t.created  AS created,
                              f.slug     AS forum,
                              t.ID       AS id,
                              t.message  AS message,
                              t.slug     AS slug,
                              t.title    AS title,
                              votes
                       FROM threads t
                                JOIN forums f ON (t.forumID = f.ID) AND (f.slug = $1)
                                JOIN users u ON (t.userID = u.ID) ${since} ${order} ${limit};`;
        try {
            const queryResult = await this.db.query({text: query, values: [forumSlug]});
            res.status(200).send(queryResult.rows);
        } catch (err) {
            console.log(err);
            res.status(500).send(err);
        }
    };

    getForumUsers = async (req, res) => {
        const forumSlug = req.params.slug;
        const limit = (req.query.limit) ? `LIMIT ${req.query.limit}` : '';
        let order = 'ORDER BY u.nickname';
        let sign = '>';
        if (req.query.desc !== undefined && req.query.desc.toUpperCase() === 'TRUE') {
            order = 'ORDER BY u.nickname DESC';
            sign = '<';
        }
        const since = (req.query.since) ? `AND lower(u.nickname) ${sign} lower('${req.query.since}') ` : '';
        const checkForumQuery = `SELECT ID
                                 FROM forums
                                 WHERE slug = $1;`;
        let forumID;
        try {
            const queryResult = await this.db.query({text: checkForumQuery, values: [forumSlug]});
            if (queryResult.rows.length === 0) {
                res.status(404).send(new Error('Forum not found'));
                return;
            } else {
                forumID = queryResult.rows[0].id;
            }
        } catch (err) {
            res.status(500).send(err);
            return;
        }
        const query = `SELECT nickname, fullname, about, email
                       FROM users u
                                LEFT JOIN threads t ON (t.forumID = $1) AND (u.ID = t.userID)
                                LEFT JOIN posts p ON (p.forumID = $1) AND (u.ID = p.userID)
                       WHERE (t IS NOT NULL OR p IS NOT NULL) ${since}
                       GROUP BY nickname, fullname, about, email
                       ${order}
                       ${limit};`;

        try {
            const queryResult = await this.db.query({text: query, values: [forumID]});
            res.status(200).send(queryResult.rows);
        } catch (err) {
            console.log(err);
            res.status(500).send(err);
        }
    };
};
