const Error = require('../libs/errors.js');

module.exports = class postHandlers {
    all_data;

    constructor(db) {
        this.db = db;
    }

    updatePost = async (req, res) => {
        const postID = req.params.id;
        if (!postID) {
            res.status(404).send(new Error('No such post'));
            return;
        }
        const message = req.body.message;

        const selectQuery = `SELECT u.nickname AS author,
                                    p.created  AS created,
                                    f.slug     AS forum,
                                    p.id       AS id,
                                    p.message  AS message,
                                    p.isEdited AS isEdited,
                                    p.threadID AS thread
                             FROM posts p
                                      JOIN users u ON (p.ID = $1) AND (p.userID = u.ID)
                                      JOIN forums f ON (f.ID = p.forumID);`;

        const updateQuery = `UPDATE posts p
                             SET 
                                 message  = $2,
                                 isEdited = CASE WHEN $2 = message THEN isEdited ELSE true END 
                             FROM (SELECT u.nickname AS author,
                                          p.created  AS created,
                                          f.slug     AS forum,
                                          p.id       AS id
                                   FROM posts p
                                            JOIN users u ON (p.userID = u.ID) AND (p.ID = $1)
                                            JOIN forums f ON (p.forumID = f.ID) FOR UPDATE) all_data
                             WHERE p.id = $1
                             RETURNING
                                 all_data.author AS author,
                                 all_data.created AS created,
                                 all_data.forum AS forum,
                                 p.id AS id,
                                 p.message AS message,
                                 p.isEdited AS isEdited,
                                 p.threadID AS thread;`;

        const queryToExecute = (message) ? updateQuery : selectQuery;
        const values = (message) ? [postID, message] : [postID];
        const queryResult = await this.db.query({text: queryToExecute, values: values});
        try {
            if (queryResult.rows.length !== 0) {
                queryResult.rows[0].isEdited = queryResult.rows[0].isedited;
                delete queryResult.rows[0].isedited;
                res.status(200).send(queryResult.rows[0]);
            } else {
                res.status(404).send(new Error('No such post'));
            }
        } catch (err) {
            res.status(500).send(err);
            console.log(err);
        }
    };

    getPosts = async (req, res) => {
        const postID = req.params.id;
        if (!postID) {
            res.status(404).send(new Error('No such post'));
            return;
        }
        const relatedArray = (req.query.related) ? req.query.related.split(',') : [''];
        if (relatedArray.length === 1 && relatedArray[0] === '' && req.query.related) {
            relatedArray[0] = 'all'
        }

        const queryPost = `SELECT u.nickname AS author,
                                  p.created  AS created,
                                  f.slug     AS forum,
                                  p.id       AS id,
                                  p.message  AS message,
                                  p.isEdited AS isEdited,
                                  p.threadID AS thread
                           FROM posts p
                                    JOIN users u ON (p.ID = $1) AND (p.userID = u.ID)
                                    JOIN forums f ON (p.forumID = f.ID)`;

        const queryAuthor = `SELECT about, email, fullname, nickname
                             FROM users u
                                      JOIN posts p ON (p.ID = $1) AND (u.ID = p.userID)`;

        const queryThread = `SELECT u.nickname AS author,
                                    t.created  AS created,
                                    f.slug     AS forum,
                                    t.id       AS id,
                                    t.message  AS message,
                                    t.slug     AS slug,
                                    t.title    AS title,
                                    t.votes    AS votes
                             FROM threads t
                                      JOIN posts p ON (p.ID = $1) AND (p.threadID = t.ID)
                                      JOIN forums f ON (f.ID = t.forumID)
                                      JOIN users u ON (u.ID = t.userID);`;

        const queryForum = `SELECT u.nickname AS "user", posts, slug, threads, title
                            FROM forums f
                                     JOIN posts p ON (p.ID = $1) AND (p.forumID = f.ID)
                                     JOIN users u ON (f.userID = u.ID);`;

        try {
            const queryPostResult = await this.db.query({text: queryPost, values: [postID]});
            if (queryPostResult.rows.length !== 0) {
                queryPostResult.rows[0].isEdited = queryPostResult.rows[0].isedited;
                delete queryPostResult.rows[0].isedited;
                const result = {post: queryPostResult.rows[0]};
                for (const relatedElem of relatedArray) {
                    switch (relatedElem) {
                        case 'all':
                            result.user = (await this.db.query({text: queryAuthor, values: [postID]})).rows[0];
                            result.forum = (await this.db.query({text: queryForum, values: [postID]})).rows[0];
                            result.thread = (await this.db.query({text: queryThread, values: [postID]})).rows[0];
                            break;
                        case 'user':
                            result.author = (await this.db.query({text: queryAuthor, values: [postID]})).rows[0];
                            break;
                        case 'forum':
                            result.forum = (await this.db.query({text: queryForum, values: [postID]})).rows[0];
                            break;
                        case 'thread':
                            result.thread = (await this.db.query({text: queryThread, values: [postID]})).rows[0];
                            break;
                        default:
                            break;
                    }
                }
                res.status(200).send(result);
            } else {
                res.status(404).send(new Error('No such post'));
            }
        } catch (err) {
            res.status(500).send(err);
            console.log(err);
        }
    };
};







