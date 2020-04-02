DROP TABLE IF EXISTS VOTES;
DROP TABLE IF EXISTS POSTS;
DROP TABLE IF EXISTS THREADS;
DROP TABLE IF EXISTS FORUMS;
DROP TABLE IF EXISTS USERS;

DROP SEQUENCE IF EXISTS serial_threads;
DROP SEQUENCE IF EXISTS serial_posts;

CREATE SEQUENCE serial_threads MINVALUE 0 START 0 NO CYCLE;
CREATE SEQUENCE serial_posts MINVALUE 0 START 0 NO CYCLE;

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
    posts   int DEFAULT nextval('serial_posts'),
    slug    citext UNIQUE NOT NULL,
    threads int DEFAULT nextval('serial_threads'),
    title   varchar(127)  NOT NULL,
    userID  int           NOT NULL,
    FOREIGN KEY (userID) REFERENCES USERS (ID)
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
);

CREATE TABLE VOTES
(
    ID       SERIAL PRIMARY KEY,
    vote     boolean NOT NULL default true,
    userID   int     NOT NULL,
    threadID int     NOT NULL,
    FOREIGN KEY (userID) REFERENCES USERS (ID),
    FOREIGN KEY (threadID) REFERENCES THREADS (ID),
    CONSTRAINT user_thread UNIQUE (userID, threadID)
)