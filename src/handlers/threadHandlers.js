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
                           WHERE slug = $1;`;
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
        // if (req.body.length === 0) {
        //     res.status(404).send(new Error('No such thread'));
        //     return;
        // }
        let threadID, forumID;
        if (isNaN(Number(req.params.slug_or_id))) {
            try {
                const query = `SELECT ID, forumID AS forum
                               FROM threads
                               WHERE slug = $1;`;
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
            currentTime = (await this.db.query({text: 'SELECT NOW() AS time;'})).rows[0].time;
            const query = `SELECT ID
                           FROM posts
                           WHERE threadID = $1`;
            parentIDs = (await this.db.query({text: query, values: [threadID]})).rows;
            parentIDs.forEach(parent => parentsSet.add(parent.id));
            if (forumID === undefined) {
                const query = `SELECT forumID as forum
                               FROM threads
                               WHERE ID = $1`;
                const queryResult = await this.db.query({text: query, values: [threadID]})
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
        newPosts.forEach((post) => {
            post.created = currentTime;
            post.threadID = threadID;
            post.forumID = forumID;
            post.isEdited = false;
            // post.parent = post.parent || 0;
            // parentsSet.add(post.parent);
        });
        for (let post of newPosts) {
            if (!parentsSet.has(post.parent) && post.parent) {
                res.status(409).send(new Error('Some post has no parent post'));
                return;
            }
            post.parent = post.parent || 0;
        }
        const insertQuery = `INSERT INTO posts (created, message, parentPostID, threadID, forumID, userID)
                             VALUES ($1, $2, $3, $4, $5, (
                                 SELECT ID
                                 FROM users u
                                 WHERE u.nickname = $6
                             ));`;
        const selectQuery = `SELECT p.ID,
                                    created,
                                    message,
                                    p.threadID   AS thread,
                                    f.slug       AS forum,
                                    nickname     AS author,
                                    parentPostID AS parent
                             FROM posts p
                                      JOIN users u ON (currval('posts_id_seq') = p.ID) AND (p.userID = u.id)
                                      JOIN forums f ON (p.forumID = f.id);`;
        try {
            for (let i = 0; i !== newPosts.length; i++) {
                const queryValues = [
                    newPosts[i].created,
                    newPosts[i].message,
                    newPosts[i].parent,
                    newPosts[i].threadID,
                    newPosts[i].forumID,
                    newPosts[i].author
                ];
                await this.db.query({text: insertQuery, values: queryValues});
                newPosts[i] = (await this.db.query({text: selectQuery})).rows[0];
            }
            res.status(201).send(newPosts);
        } catch (err) {
            if (err.code === '23502') {
                res.status(404).send(new Error('User not found'));
            } else {
                console.log(err);
                console.log(insertQuery);
                res.status(500).send(err);
            }
        }
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
                                JOIN users u ON (t.userID = u.ID);`;
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
        let order = 'ORDER BY t.created';
        let sign = '>=';
        if (req.query.desc !== undefined && req.query.desc.toUpperCase() === 'TRUE') {
            order = 'ORDER BY t.created DESC';
            sign = '<=';
        }
        const since = (req.query.since) ? `AND t.created ${sign} '${req.query.since}'` : '';
        const sort = req.query.since;

        console.log('getThreadPosts');
        res.status(404).send('Пока не сделано');
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
                                    AND (v.threadID = $2);`;
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
                                          VALUES ((SELECT ID FROM users WHERE nickname = $1), $2, $3)
                                          ON CONFLICT ON CONSTRAINT user_thread DO UPDATE SET vote = $3`;
        const updateThreadsQuery = `UPDATE threads
                                    SET votes = votes + $2
                                    WHERE ID = $1;`;

        if (!oldVote || (oldVote && oldVote.vote !== newVote)) {
            if (oldVote && oldVote.vote !== newVote) {
                voice *= 2;
            }
            try {
                await this.db.query({text: insertOrUpdateVotesQuery, values: [nickname, threadID, newVote]});
                await this.db.query({text: updateThreadsQuery, values: [threadID, voice]});
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
                                      JOIN users u ON (t.userID = u.ID);`;
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