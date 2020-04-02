const Error = require('../libs/errors.js');

module.exports = class threadHandlers {
    constructor(db) {
        this.db = db;
    }

    createThreadPosts = async (req, res) => {
        if (req.body.length === 0) {
            res.status(201).send([]);
            return;
        }
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
            console.log(err);
            res.status(500).end(err);
        }
        const newPosts = req.body;
        newPosts.forEach((post) => {
            post.created = currentTime;
            post.threadID = threadID;
            post.forumID = forumID;
            post.isEdited = false;
            post.parent = post.parent || 0;
            parentsSet.add(post.parent);
        });
        let done = false;
        newPosts.forEach((post) => {
            if (!parentsSet.has(post.parent)) {
                res.status(409).send(new Error('Some post has no parent post'));
                done = true;
            }
        });
        if (done) {
            return;
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
                                    p.threadID AS thread,
                                    f.slug     AS forum,
                                    nickname   AS author,
                                    parentPostID
                             FROM posts p
                                      JOIN users u ON (currval('posts_id_seq') = p.ID) AND (p.userID = u.id)
                                      JOIN forums f ON (p.forumID = f.id);`;
        const result = [];
        try {
            for (const post of newPosts) {
                const queryValues = [
                    post.created,
                    post.message,
                    post.parent,
                    post.threadID,
                    post.forumID,
                    post.author
                ];
                await this.db.query({text: insertQuery, values: queryValues});
                const queryResult = (await this.db.query({text: selectQuery})).rows[0];
                if (queryResult.parentpostid === 0) {
                    delete queryResult.parentpostid;
                }
                result.push(queryResult);
            }
            res.status(201).send(result);
        } catch (err) {
            console.log(err);
            res.status(500).send(err);
        }
    };

    getThreadDetails = async (req, res) => {
        console.log('getThreadDetails');
        res.status(404).send('Пока не сделано')
    };

    updateThreadDetails = async (req, res) => {
        console.log('updateThreadDetails');
        res.status(404).send('Пока не сделано')
    };

    getThreadPosts = async (req, res) => {
        console.log('getThreadPosts');
        res.status(404).send('Пока не сделано');
    };

    voteThread = async (req, res) => {
        let threadID;
        if (isNaN(Number(req.params.slug_or_id))) {
            const query = `SELECT ID
                           FROM threads
                           WHERE slug = $1;`;
            try {
                const queryResult = await this.db.query({text: query, values: [req.params.slug_or_id]});
                threadID = queryResult.rows[0].id;
                if (queryResult.rows.length === 0) {
                    res.status(404).send(new Error('No such thread'));
                    return;
                }
            } catch (err) {
                res.status(500).end(err);
                return;
            }
        } else {
            threadID = Number(req.params.slug_or_id);
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
                this.db.query({text: updateThreadsQuery, values: [threadID, voice]});
            } catch (err) {
                console.log(err);
                res.status(500).send(err);
                return;
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