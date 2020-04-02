DROP TABLE IF EXISTS VOTES;
DROP TABLE IF EXISTS POSTS;
DROP TABLE IF EXISTS THREADS;
DROP TABLE IF EXISTS FORUMS;
DROP TABLE IF EXISTS USERS;

DROP SEQUENCE IF EXISTS serial_threads;
DROP SEQUENCE IF EXISTS serial_posts;

CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE USERS
(
    ID       SERIAL PRIMARY KEY,
    nickname citext UNIQUE,
    email    citext UNIQUE NOT NULL,
    fullName varchar(127)  NOT NULL,
    about    text
);

CREATE TABLE FORUMS
(
    ID      SERIAL PRIMARY KEY,
    posts   int DEFAULT 0,
    slug    citext UNIQUE NOT NULL,
    threads int DEFAULT 0,
    title   varchar(127)  NOT NULL,
    userID  int           NOT NULL,
    FOREIGN KEY (userID) REFERENCES USERS (ID) ON DELETE CASCADE
);

CREATE TABLE THREADS
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

CREATE TABLE POSTS
(
    ID           SERIAL PRIMARY KEY,
    created      timestamp          NOT NULL,
    message      text               NOT NULL,
    isEdited     bool default false NOT NULL,
    parentPostID int                NOT NULL,
    userID       int                NOT NULL,
    threadID     int                NOT NULL,
    forumID      int                NOT NULL,
    FOREIGN KEY (threadID) REFERENCES THREADS (ID) ON DELETE CASCADE,
    FOREIGN KEY (userID) REFERENCES USERS (ID) ON DELETE CASCADE,
    FOREIGN KEY (forumID) REFERENCES FORUMS (ID) ON DELETE CASCADE
);

CREATE TABLE VOTES
(
    ID       SERIAL PRIMARY KEY,
    vote     boolean NOT NULL default true,
    userID   int     NOT NULL,
    threadID int     NOT NULL,
    FOREIGN KEY (userID) REFERENCES USERS (ID) ON DELETE CASCADE,
    FOREIGN KEY (threadID) REFERENCES THREADS (ID) ON DELETE CASCADE,
    CONSTRAINT user_thread UNIQUE (userID, threadID)
);

CREATE OR REPLACE FUNCTION increment(column_name text, forum_id integer) RETURNS void AS
$func$
BEGIN
    EXECUTE format('UPDATE forums SET %I = %s + 1 WHERE ID = %s;', column_name, column_name, forum_id);
END;
$func$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_posts() RETURNS trigger AS
$increment_posts$
BEGIN
    PERFORM increment('posts', NEW.forumID);
    RETURN NULL;
END;
$increment_posts$ LANGUAGE plpgsql;
CREATE TRIGGER increment_posts
    AFTER INSERT
    ON posts
    FOR EACH ROW
EXECUTE PROCEDURE increment_posts();

CREATE OR REPLACE FUNCTION increment_threads() RETURNS trigger AS
$increment_threads$
BEGIN
    PERFORM increment('threads', NEW.forumID);
    RETURN NULL;
END;
$increment_threads$ LANGUAGE plpgsql;
CREATE TRIGGER increment_threads
    AFTER INSERT
    ON posts
    FOR EACH ROW
EXECUTE PROCEDURE increment_threads();
