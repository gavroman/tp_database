const server = require('./server.js');
const UserHandlers = require('./user/userHandlers.js');
const ForumHandlers = require('./user/forumHandlers.js');

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

// POST   /forum/create       Создание форума
// POST   /forum/{slug}/create       Создание ветки
// GET    /forum/{slug}/details      Получение информации о форуме
// GET    /forum/{slug}/threads      Список ветвей обсужления форума
// GET    /forum/{slug}/users      Пользователи данного форума