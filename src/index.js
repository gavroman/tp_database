const server = require('./server.js');
const UserHandlers = require('./handlers/userHandlers.js');
const ForumHandlers = require('./handlers/forumHandlers.js');
const PostHandlers = require('./handlers/postHandlers.js');
const ThreadHandlers = require('./handlers/threadHandlers.js');
const ServiceHandlers = require('./handlers/serviceHandlers.js');

const app = server.app;
const db = server.db;

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