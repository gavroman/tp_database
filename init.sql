-- DROP TABLE IF EXISTS VOTES;
-- DROP TABLE IF EXISTS POSTS;
-- DROP TABLE IF EXISTS THREADS;
-- DROP TABLE IF EXISTS FORUMS;
-- DROP TABLE IF EXISTS USERS;

DROP trigger IF EXISTS handle_new_post ON posts CASCADE;
DROP FUNCTION IF EXISTS handle_new_post;

DROP trigger IF EXISTS increment_threads ON threads CASCADE;
DROP FUNCTION IF EXISTS increment_threads;

CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE IF NOT EXISTS USERS
(
    ID       SERIAL PRIMARY KEY,
    nickname citext COLLATE "C" UNIQUE,
    email    citext UNIQUE NOT NULL,
    fullName varchar(127)  NOT NULL,
    about    text
);

CREATE TABLE IF NOT EXISTS FORUMS
(
    ID      SERIAL PRIMARY KEY,
    posts   int DEFAULT 0,
    slug    citext UNIQUE NOT NULL,
    threads int DEFAULT 0,
    title   varchar(127)  NOT NULL,
    userID  int           NOT NULL,
    FOREIGN KEY (userID) REFERENCES USERS (ID) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS THREADS
(
    ID      SERIAL PRIMARY KEY,
    title   varchar(127) NOT NULL,
    created timestamptz,
    message text         NOT NULL,
    slug    citext UNIQUE,
    votes   int default 0,
    userID  int          NOT NULL,
    forumID int          NOT NULL,
    FOREIGN KEY (userID) REFERENCES USERS (ID) ON DELETE CASCADE,
    FOREIGN KEY (forumID) REFERENCES FORUMS (ID) ON DELETE CASCADE /*,
    UNIQUE (forumID, slug)*/
);

CREATE TABLE IF NOT EXISTS POSTS
(
    ID           SERIAL PRIMARY KEY,
    created      timestamp          NOT NULL,
    message      text               NOT NULL,
    "isEdited"   bool default false NOT NULL,
    parentPostID int                NOT NULL,
    parents      integer[],
    userID       int                NOT NULL,
    threadID     int                NOT NULL,
    forumID      int                NOT NULL,
    FOREIGN KEY (threadID) REFERENCES THREADS (ID) ON DELETE CASCADE,
    FOREIGN KEY (userID) REFERENCES USERS (ID) ON DELETE CASCADE,
    FOREIGN KEY (forumID) REFERENCES FORUMS (ID) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS VOTES
(
    ID       SERIAL PRIMARY KEY,
    vote     boolean NOT NULL default true,
    userID   int     NOT NULL,
    threadID int     NOT NULL,
    FOREIGN KEY (userID) REFERENCES USERS (ID) ON DELETE CASCADE,
    FOREIGN KEY (threadID) REFERENCES THREADS (ID) ON DELETE CASCADE,
    CONSTRAINT user_thread UNIQUE (userID, threadID)
);

CREATE INDEX IF NOT EXISTS forumUser ON forums (userID);
CREATE INDEX IF NOT EXISTS postForum ON posts (forumID);
CREATE INDEX IF NOT EXISTS postThread ON posts (threadID);
CREATE INDEX IF NOT EXISTS postUser ON posts (userID);
CREATE INDEX IF NOT EXISTS forumtSlug ON forums (slug, id);
CREATE INDEX IF NOT EXISTS postsThreadCreatedId ON posts(threadID, created, id);
CREATE INDEX IF NOT EXISTS postsThreadPathId ON posts(threadID, parents, id);
CREATE INDEX IF NOT EXISTS threadsForumCreated on threads (forumID, created);
CREATE INDEX IF NOT EXISTS treadUserForum ON threads (userID, forumID);


CREATE OR REPLACE FUNCTION increment(column_name text, forum_id integer) RETURNS void AS
$func$
BEGIN
    EXECUTE format('UPDATE forums SET %I = %s + 1 WHERE ID = %s;', column_name, column_name, forum_id);
END;
$func$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION handle_new_post() RETURNS trigger AS
$handle_new_post$
DECLARE
    old_parents integer[] := '{}';
BEGIN
    PERFORM increment('posts', NEW.forumID);
    SELECT parents INTO old_parents FROM posts WHERE id = NEW.parentPostID LIMIT 1;
    UPDATE posts SET parents = array_append(old_parents, NEW.ID) WHERE ID = NEW.ID;
    RETURN NULL;
END;
$handle_new_post$ LANGUAGE plpgsql;
CREATE TRIGGER handle_new_post
    AFTER INSERT
    ON posts
    FOR EACH ROW
EXECUTE PROCEDURE handle_new_post();

CREATE OR REPLACE FUNCTION increment_threads() RETURNS trigger AS
$increment_threads$
BEGIN
    PERFORM increment('threads', NEW.forumID);
    RETURN NULL;
END;
$increment_threads$ LANGUAGE plpgsql;
CREATE TRIGGER increment_threads
    AFTER INSERT
    ON threads
    FOR EACH ROW
EXECUTE PROCEDURE increment_threads();
