DROP TABLE IF EXISTS POSTS;
DROP TABLE IF EXISTS THREADS;
DROP TABLE IF EXISTS FORUMS;
DROP TABLE IF EXISTS USERS;
CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE USERS
(
    ID       SERIAL PRIMARY KEY,
    nickname varchar(63) UNIQUE,
    email    varchar(127) UNIQUE NOT NULL,
    fullName varchar(127)        NOT NULL,
    about    text
);
ALTER TABLE users
    ALTER COLUMN email TYPE citext;
ALTER TABLE users
    ALTER COLUMN nickname TYPE citext;
CREATE TABLE FORUMS
(
    ID     SERIAL PRIMARY KEY,
    posts  int,
    slug   varchar(127) UNIQUE NOT NULL,
    treads int,
    title  varchar(127)        NOT NULL,
    userID int                 NOT NULL,
    FOREIGN KEY (userID) REFERENCES USERS (ID)
);
    CREATE TABLE THREADS
(
    ID      SERIAL PRIMARY KEY,
    title   varchar(127)        NOT NULL,
    created timestamp,
    message varchar(511)        NOT NULL,
    slug    varchar(127) UNIQUE NOT NULL,
    votes   int default 0       NOT NULL,
    userID  int                 NOT NULL,
    forumID int                 NOT NULL,
--     FOREIGN KEY (userID) REFERENCES USERS (ID),
    FOREIGN KEY (forumID) REFERENCES FORUMS (ID)
);

CREATE TABLE POSTS
(
    ID           SERIAL PRIMARY KEY,
    created      timestamp,
    message      varchar(511)       NOT NULL,
    isEdited     bool default false NOT NULL,
    parentPostID int  default 0,
    userID       int                NOT NULL,
    forumID      int                NOT NULL,
    FOREIGN KEY (parentPostID) REFERENCES POSTS (ID),
    FOREIGN KEY (userID) REFERENCES USERS (ID),
    FOREIGN KEY (forumID) REFERENCES FORUMS (ID)
)