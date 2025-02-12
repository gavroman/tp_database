const Error = require('../libs/errors.js');

const NO_SUCH_THREAD = -1;
module.exports = class threadHandlers {
    constructor(db) {
        this.db = db;
    }

    getThreadId = async (slugOrId) => {
        let threadID;
        if (isNaN(Number(slugOrId))) {
            const query = `SELECT ID
                           FROM threads
                           WHERE slug = $1
                           LIMIT 1;`;
            const queryResult = await this.db.query({text: query, values: [slugOrId]});
            if (queryResult.rows.length === 0) {
                return NO_SUCH_THREAD;
            }
            threadID = queryResult.rows[0].id;
        } else {
            threadID = Number(slugOrId);
        }
        return threadID;
    };

    createThreadPosts = async (req, res) => {
        let threadID, forumID;
        if (isNaN(Number(req.params.slug_or_id))) {
            try {
                const query = `SELECT ID, forumID AS forum
                               FROM threads
                               WHERE slug = $1
                               LIMIT 1;`;
                const queryResult = await this.db.query({text: query, values: [req.params.slug_or_id]});
                if (queryResult.rows.length === 0) {
                    res.status(404).send(new Error('No such thread'));
                    return;
                }
                threadID = queryResult.rows[0].id;
                forumID = queryResult.rows[0].forum;
            } catch (err) {
                res.status(500).end(err);
            }
        } else {
            threadID = Number(req.params.slug_or_id);
        }

        const parentsSet = new Set();
        let currentTime, parentIDs;
        try {
            currentTime = (await this.db.query({text: 'SELECT CURRENT_TIMESTAMP AS time;'})).rows[0].time;
            const query = `SELECT ID
                           FROM posts
                           WHERE threadID = $1`;
            parentIDs = (await this.db.query({text: query, values: [threadID]})).rows;
            parentIDs.forEach(parent => parentsSet.add(parent.id));
            if (forumID === undefined) {
                const query = `SELECT forumID as forum
                               FROM threads
                               WHERE ID = $1
                               LIMIT 1`;
                const queryResult = await this.db.query({text: query, values: [threadID]});
                if (queryResult.rows.length === 0) {
                    res.status(404).send(new Error('No such thread'));
                    return;
                }
                forumID = queryResult.rows[0].forum;
            }
        } catch (err) {
            res.status(500).end(err);
        }
        const newPosts = req.body;
        const getValuesString = (newPost) => {
            return `($1, '${newPost.message}', ${newPost.parent || 0}, ${threadID}, ${forumID}, (
                SELECT ID
                FROM users u
                WHERE u.nickname = '${newPost.author}'
                LIMIT 1
            )),`;
        };
        let insertQuery = 'INSERT INTO posts (created, message, parentPostID, threadID, forumID, userID) VALUES ';
        for (let post of newPosts) {
            if (!parentsSet.has(post.parent) && post.parent) {
                res.status(409).send(new Error('Some post has no parent post'));
                return;
            }
            post.parent = post.parent || 0;
            insertQuery += getValuesString(post);
        }
        if (newPosts.length) {
            insertQuery = insertQuery.slice(0, -1) + ` RETURNING id,created,message,threadID AS thread,
                (SELECT nickname FROM users WHERE id = userid LIMIT 1) AS author,
                (SELECT slug FROM forums WHERE id = forumid LIMIT 1) AS forum,
                parentPostID AS parent;`;
            try {
                const insertResult = await this.db.query({text: insertQuery, values: [currentTime]});
                if (insertResult.rows) {
                    res.status(201).send(insertResult.rows);
                    return;
                }
            } catch (err) {
                if (err.code === '23502') {
                    res.status(404).send(new Error('User not found'));
                } else {
                    console.log(err);
                    res.status(500).send(err);
                }
                return;
            }
        }
        res.status(201).send([]);
    };

    getThreadDetails = async (req, res) => {
        let threadID;
        try {
            threadID = await this.getThreadId(req.params.slug_or_id);
        } catch (err) {
            res.status(500).send(err);
        }
        if (threadID === NO_SUCH_THREAD) {
            res.status(404).send(new Error('No such thread'));
            return;
        }
        const query = `SELECT u.nickname AS author,
                              t.created  AS created,
                              f.slug     AS forum,
                              t.id       AS id,
                              message,
                              t.slug     AS slug,
                              t.title    AS title,
                              votes
                       FROM threads t
                                JOIN forums f ON (t.ID = $1) AND (t.forumID = f.ID)
                                JOIN users u ON (t.userID = u.ID)
                       LIMIT 1;`;
        const queryResult = await this.db.query({text: query, values: [threadID]});
        if (queryResult.rows.length !== 0) {
            res.status(200).send(queryResult.rows[0]);
        } else {
            res.status(404).send(new Error('No such thread'));
        }
    };

    updateThreadDetails = async (req, res) => {
        let threadID;
        try {
            threadID = await this.getThreadId(req.params.slug_or_id);
        } catch (err) {
            res.status(500).send(err);
        }
        if (threadID === NO_SUCH_THREAD) {
            res.status(404).send(new Error('No such thread'));
            return;
        }
        const body = req.body;
        const messageUpdateString = (body.message) ? `message = '${body.message}',` : 'message = message,';
        const titleUpdateString = (body.title) ? `title = '${body.title}'` : 'title = title';
        const query = `UPDATE threads t
                       SET ${messageUpdateString}
                           ${titleUpdateString}
                       FROM (SELECT u.nickname AS author,
                                    t.created  AS created,
                                    f.slug     AS forum,
                                    t.id       AS ID,
                                    t.slug     AS slug,
                                    t.votes    AS votes
                             FROM threads t
                                      JOIN users u ON (t.userID = u.ID) AND (t.ID = $1)
                                      JOIN forums f ON (t.forumID = f.ID) FOR UPDATE) all_data
                       WHERE t.id = $1
                       RETURNING all_data.author AS author,
                           all_data.created AS created,
                           all_data.forum AS forum,
                           all_data.ID AS ID,
                           t.message AS message,
                           all_data.slug AS slug,
                           t.title AS title,
                           all_data.votes AS votes;`;
        try {
            const queryResult = await this.db.query({text: query, values: [threadID]});
            if (queryResult.rows.length !== 0) {
                res.status(200).send(queryResult.rows[0]);
            } else {
                res.status(404).send(new Error('No such thread'));
            }
        } catch (err) {
            res.status(500).send(err);
            console.log(err);
        }
    };

    getThreadPosts = async (req, res) => {
        let threadID;
        try {
            threadID = await this.getThreadId(req.params.slug_or_id);
        } catch (err) {
            res.status(500).send(err);
        }
        if (threadID === NO_SUCH_THREAD) {
            res.status(404).send(new Error('No such thread'));
            return;
        }
        const limit = (req.query.limit) ? `LIMIT ${req.query.limit}` : '';
        const sort = (req.query.sort) ? req.query.sort.toLowerCase() : '';
        const desc = (req.query.desc && req.query.desc.toLowerCase() === 'true') ? 'DESC' : '';
        const sign = (desc) ? '<' : '>';

        let since;
        let order;
        let parentTreeQuery;
        switch (sort) {
            case 'tree':
                since = (req.query.since)
                    ? `AND p.parents ${sign} (SELECT parents FROM posts WHERE id = ${req.query.since} LIMIT 1)` : '';
                order = 'ORDER BY p.parents ' + desc + ', p.id ' + desc;
                break;
            case 'parent_tree':
                const orderInner = 'ORDER BY ID ' + desc;
                const order0uter = (req.query.desc === 'true')
                    ? 'ORDER BY p.parents[2] DESC, p.parents, id'
                    : 'ORDER BY p.parents';
                since = (req.query.since)
                    ? `AND parents[2] ${sign} (SELECT parents[2] FROM posts WHERE id = ${req.query.since} LIMIT 1)` : '';

                parentTreeQuery = `
                                WITH threadParentPosts AS (
                                        SELECT ID FROM posts 
                                        WHERE (threadID = $1) AND (parentPostID = 0)
                                        ${since} ${orderInner} ${limit}
                                ) 
                                SELECT   
                                u.nickname AS author,
                                f.slug AS forum,
                                p.id,
                                p.created,
                                p.message,
                                p.parentPostID AS parent,
                                p.threadID AS thread,
                                p.parents AS parents FROM posts p 
                                  JOIN users u ON  (p.userID = u.ID)
                                  JOIN forums f ON (p.forumID = f.ID) AND p.parents[2] in (SELECT id FROM threadParentPosts) 
                                  ${order0uter} ;`;
                // console.log(parentTreeQuery);
                break;
            case 'flat':
            default:
                since = (req.query.since) ? `AND p.id ${sign} ${req.query.since}` : '';
                order = 'ORDER BY p.id ' + desc;
        }
        let query = `SELECT u.nickname AS author,
                                  f.slug     AS forum,
                                  p.id,
                                  p.created,
                                  p.message,
                                  p.parentPostID AS parent,
                                  p.threadID AS thread,
                                  p.parents AS parents
                           FROM posts p
                                    JOIN users u ON (p.threadID = $1) AND (p.userID = u.ID)
                                    JOIN forums f ON (p.forumID = f.ID) ${since} ${order} ${limit};`;
        // console.log(query);
        const checkThreadQuery = `SELECT ID
                                  FROM threads
                                  WHERE ID = $1;`;
        try {
            const queryResult = await this.db.query({text: checkThreadQuery, values: [threadID]});
            if (queryResult.rows.length === 0) {
                res.status(404).send(new Error('Thread not found'));
                return;
            }
            if (sort === 'parent_tree') {
                const queryResult = await this.db.query({text: parentTreeQuery, values: [threadID]});
                res.status(200).send(queryResult.rows);
            } else {
                const queryResult = await this.db.query({text: query, values: [threadID]});
                res.status(200).send(queryResult.rows);
            }
        } catch (err) {
            console.log(err);
            res.status(500).send(err);
        }
    };

    voteThread = async (req, res) => {
        let threadID;
        try {
            threadID = await this.getThreadId(req.params.slug_or_id);
        } catch (err) {
            res.status(500).send(err);
        }
        if (threadID === NO_SUCH_THREAD) {
            res.status(404).send(new Error('No such thread'));
            return;
        }

        let voice = Number(req.body.voice);
        const newVote = voice > 0;
        const nickname = req.body.nickname;

        const checkVoteQuery = `SELECT v.ID AS id, userId, threadId, vote
                                FROM votes v
                                         JOIN users u ON (u.nickname = $1)
                                    AND (v.userID = u.ID)
                                    AND (v.threadID = $2)
                                LIMIT 1;`;
        let oldVote;
        try {
            const queryVoteCheckResult = await this.db.query({text: checkVoteQuery, values: [nickname, threadID]});
            if (queryVoteCheckResult) {
                oldVote = queryVoteCheckResult.rows[0];
            }
        } catch (err) {
            console.log(err);
            res.status(500).send(err);
            return;
        }
        const insertOrUpdateVotesQuery = `insert
                                          into votes(userID, threadID, vote)
                                          VALUES ((SELECT ID FROM users WHERE nickname = $1 LIMIT 1), $2, $3)
                                          ON CONFLICT ON CONSTRAINT user_thread DO UPDATE SET vote = $3`;
        const updateThreadsQuery = `UPDATE threads
                                    SET votes = votes + $2
                                    WHERE ID = $1`;
        let updateThreadPromise;
        const promises = [];
        if (!oldVote || (oldVote && oldVote.vote !== newVote)) {
            if (oldVote && oldVote.vote !== newVote) {
                voice *= 2;
            }
            promises.push(
                this.db.query({text: updateThreadsQuery, values: [threadID, voice]}),
                this.db.query({text: insertOrUpdateVotesQuery, values: [nickname, threadID, newVote]})
            );
        }
        const selectQuery = `SELECT u.nickname AS author,
                                    created,
                                    f.slug     AS forum,
                                    t.ID       AS id,
                                    message,
                                    t.slug     AS slug,
                                    t.title    AS title,
                                    votes
                             FROM threads t
                                      JOIN forums f ON (t.forumID = f.ID) AND (t.Id = $1)
                                      JOIN users u ON (t.userID = u.ID)
                             LIMIT 1;`;
        if (promises) {
            try {
                await Promise.all(promises);
            } catch (err) {
                if (err.code === '23503' || err.code === '23502') {
                    res.status(404).send(new Error('No such thread or user'));
                    return;
                } else {
                    console.log(err);
                    res.status(500).send(err);
                }
            }
        }
        try {
            const queryResult = await this.db.query({text: selectQuery, values: [threadID]});
            if (queryResult.rows.length === 0) {
                res.status(404).send(new Error('No such thread'));
            } else {
                res.status(200).send(queryResult.rows[0]);
            }
        } catch (err) {
            console.log(err);
            res.status(500).send(err);
        }
    };
};
