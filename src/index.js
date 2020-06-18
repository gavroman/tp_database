const fs = require('fs');
const {Pool} = require('pg');
const express = require('express');
const morgan = require('morgan');

(async () => {
    const db = new Pool({
        host: 'localhost',
        port: 5432,
        user: 'tp_bd_user',
        database: 'tp_bd',
        password: 'bazulika',
    });

    const sqlInitQueries = fs.readFileSync('./init.sql').toString();

    try {
        await db.connect();
        console.log('Database connected');
        await db.query({text: sqlInitQueries});
        console.log('Database inited');
    } catch (err) {
        console.error('Initialization error', err.stack);
    }

    const app = express();
    app.use(express.json());
    // app.use(morgan('dev'));
    const port = 5000;
    app.listen(port, () => {
        console.log('Listening on port', port);
    });

    const UserHandlers = require('./handlers/userHandlers.js');
    const ForumHandlers = require('./handlers/forumHandlers.js');
    const PostHandlers = require('./handlers/postHandlers.js');
    const ThreadHandlers = require('./handlers/threadHandlers.js');
    const ServiceHandlers = require('./handlers/serviceHandlers.js');

    let userHandlers = new UserHandlers(db);
    app.post('/api/user/:nickname/create', userHandlers.createUser);
    app.get('/api/user/:nickname/profile', userHandlers.getUser);
    app.post('/api/user/:nickname/profile', userHandlers.updateUser);

    let forumHandlers = new ForumHandlers(db);
    app.post('/api/forum/create', forumHandlers.createForum);
    app.post('/api/forum/:slug/create', forumHandlers.createForumThread);
    app.get('/api/forum/:slug/details', forumHandlers.getForumDetails);
    app.get('/api/forum/:slug/threads', forumHandlers.getForumThreads);
    app.get('/api/forum/:slug/users', forumHandlers.getForumUsers);

    let postHandlers = new PostHandlers(db);
    app.get('/api/post/:id/details', postHandlers.getPosts);
    app.post('/api/post/:id/details', postHandlers.updatePost);

    let threadHandlers = new ThreadHandlers(db);
    app.post('/api/thread/:slug_or_id/create', threadHandlers.createThreadPosts);
    app.get('/api/thread/:slug_or_id/details', threadHandlers.getThreadDetails);
    app.post('/api/thread/:slug_or_id/details', threadHandlers.updateThreadDetails);
    app.get('/api/thread/:slug_or_id/posts', threadHandlers.getThreadPosts);
    app.post('/api/thread/:slug_or_id/vote', threadHandlers.voteThread);

    let serviceHandlers = new ServiceHandlers(db);
    app.post('/api/service/clear', serviceHandlers.clearAllData);
    app.get('/api/service/status', serviceHandlers.getInfo);

    let heartbeatCounter = 0;
    app.get('/api', (req, res) => {
        if (++heartbeatCounter === 3) {
            serviceHandlers.analyze();
        }
        res.status(404).end();
        console.log('API CHECK', heartbeatCounter);
    });
})();
