const fs = require('fs');
const {Pool} = require('pg');
const express = require('express');

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
    app.use(express.json()); // for parsing application/json

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
    app.post('/api/user/:nickname/create', (req, res) => {console.log('/api/user/:nickname/create'); userHandlers.createUser(req, res)});
    app.get('/api/user/:nickname/profile', (req, res) => {console.log('/api/user/:nickname/profile'); userHandlers.getUser(req, res)});
    app.post('/api/user/:nickname/profile', (req, res) => {console.log('/api/user/:nickname/profile'); userHandlers.updateUser(req, res)});

    let forumHandlers = new ForumHandlers(db);
    app.post('/api/forum/create', (req, res) => {console.log('/api/forum/create'); forumHandlers.createForum(req, res)});
    app.post('/api/forum/:slug/create', (req, res) => {console.log('/api/forum/:slug/create'); forumHandlers.createForumThread(req, res)});
    app.get('/api/forum/:slug/details', (req, res) => {console.log('/api/forum/:slug/details'); forumHandlers.getForumDetails(req, res)});
    app.get('/api/forum/:slug/threads', (req, res) => {console.log('/api/forum/:slug/threads'); forumHandlers.getForumThreads(req, res)});
    app.get('/api/forum/:slug/users', (req, res) => {console.log('/api/forum/:slug/users'); forumHandlers.getForumUsers(req, res)});

    let postHandlers = new PostHandlers(db);
    app.get('/api/post/:id/details', (req, res) => {console.log('/api/post/:id/details'); postHandlers.getPosts(req, res)});
    app.post('/api/post/:id/details', (req, res) => {console.log('/api/post/:id/details'); postHandlers.updatePost(req, res)});

    let threadHandlers = new ThreadHandlers(db);
    app.post('/api/thread/:slug_or_id/create', (req, res) => {console.log('/api/thread/:slug_or_id/create'); threadHandlers.createThreadPosts(req, res)});
    app.get('/api/thread/:slug_or_id/details', (req, res) => {console.log('/api/thread/:slug_or_id/details'); threadHandlers.getThreadDetails(req, res)});
    app.post('/api/thread/:slug_or_id/details', (req, res) => {console.log('/api/thread/:slug_or_id/details'); threadHandlers.updateThreadDetails(req, res)});
    app.get('/api/thread/:slug_or_id/posts', (req, res) => {console.log('/api/thread/:slug_or_id/posts'); threadHandlers.getThreadPosts(req, res)});
    app.post('/api/thread/:slug_or_id/vote', (req, res) => {console.log('/api/thread/:slug_or_id/vote'); threadHandlers.voteThread(req, res)});

    let serviceHandlers = new ServiceHandlers(db);
    app.post('/api/service/clear', (req, res) => {console.log('/api/service/clear'); serviceHandlers.clearAllData(req, res)});
    app.get('/api/service/status', (req, res) => {console.log('/api/service/status'); serviceHandlers.getInfo(req, res)});
})();
