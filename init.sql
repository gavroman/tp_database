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
    nickname varchar(63) UNIQUE,
    email    varchar(127) UNIQUE NOT NULL,
    fullName varchar(127)        NOT NULL,
    about    text
);
ALTER TABLE USERS
    ALTER COLUMN email TYPE citext;
ALTER TABLE USERS
    ALTER COLUMN nickname TYPE citext;



CREATE SEQUENCE serial_threads MINVALUE 0 START 0 NO CYCLE;
CREATE SEQUENCE serial_posts MINVALUE 0 START 0 NO CYCLE;
CREATE TABLE FORUMS
(
    ID      SERIAL PRIMARY KEY,
    posts   int DEFAULT nextval('serial_posts'),
    slug    varchar(127) UNIQUE NOT NULL,
    threads int DEFAULT nextval('serial_threads'),
    title   varchar(127)        NOT NULL,
    userID  int                 NOT NULL,
    FOREIGN KEY (userID) REFERENCES USERS (ID)
);
ALTER TABLE FORUMS
    ALTER COLUMN slug TYPE citext;

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
    FOREIGN KEY (userID) REFERENCES USERS (ID),
    FOREIGN KEY (forumID) REFERENCES FORUMS (ID)/*,
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
    FOREIGN KEY (threadID) REFERENCES THREADS (ID),
    FOREIGN KEY (userID) REFERENCES USERS (ID),
    FOREIGN KEY (forumID) REFERENCES FORUMS (ID)
)