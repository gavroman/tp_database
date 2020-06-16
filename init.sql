DROP TABLE IF EXISTS VOTES;
DROP TABLE IF EXISTS POSTS;
DROP TABLE IF EXISTS THREADS;
DROP TABLE IF EXISTS FORUMS;
DROP TABLE IF EXISTS USERS;
DROP TABLE IF EXISTS FORUMUSERS;


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

CREATE TABLE IF NOT EXISTS forumUsers
(
    forumID int NOT NULL,
    userID  int NOT NULL,
    unique (forumID, userID)
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

create index if not exists postsForum on posts (forumID);
create index if not exists postsUsers on posts (userID);

create index if not exists postsParent on posts ((parents[1]));
create index if not exists postsCreated on posts (created);
create index if not exists threadForumID on threads (forumID);
create index if not exists forumUsersID on threads (userID);

CREATE INDEX if not exists postsThreadCreatedId ON posts(threadID, created, id);
CREATE INDEX if not exists postsThreadPathId ON posts(threadID, parents, id);


CREATE OR REPLACE FUNCTION increment(column_name text, forum_id integer) RETURNS void AS
$func$
BEGIN
    EXECUTE format('UPDATE forums SET %I = %s + 1 WHERE ID = %s;', column_name, column_name, forum_id);
END;
$func$ LANGUAGE plpgsql;

--
-- CREATE OR REPLACE FUNCTION handle_new_post() RETURNS trigger AS
-- $handle_new_post$
-- DECLARE
--     old_parents integer[] := '{}';
-- BEGIN
--     PERFORM increment('posts', NEW.forumID);
--     SELECT parents INTO old_parents FROM posts WHERE id = NEW.parentPostID LIMIT 1;
--     UPDATE posts SET parents = array_append(old_parents, NEW.ID) WHERE ID = NEW.ID;
--     RETURN NULL;
-- END;
-- $handle_new_post$ LANGUAGE plpgsql;
-- CREATE TRIGGER handle_new_post
--     AFTER INSERT
--     ON posts
--     FOR EACH ROW
-- EXECUTE PROCEDURE handle_new_post();


-- UPDATE POST PATH
CREATE OR REPLACE FUNCTION update_post_path() RETURNS TRIGGER AS
$$
DECLARE
    old_parents integer[] := '{}';
BEGIN
    PERFORM increment('posts', NEW.forumID);
    IF NEW.parentPostID != 0 THEN
        SELECT parents INTO old_parents FROM posts WHERE id = NEW.parentPostID LIMIT 1;
        UPDATE posts
        SET parents = array_append(old_parents, NEW.ID)
        WHERE posts.id = NEW.id;
    ELSE
        UPDATE posts SET parents = ARRAY [NEW.id] WHERE id = NEW.id;
    END IF;
    return NEW;
END;
$$ LANGUAGE plpgsql;


DROP TRIGGER IF EXISTS trigger_update_post_path ON posts;
CREATE TRIGGER trigger_update_post_path
    AFTER INSERT
    ON posts
    FOR EACH ROW
EXECUTE PROCEDURE update_post_path();





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


-- UPDATE FORUM USERS
create or replace function update_forum_users() RETURNS trigger AS
$$
begin
    INSERT INTO forumusers (forumID, userID)
    VALUES (NEW.forumID, NEW.userID)
    ON CONFLICT DO NOTHING;
    return NEW;
end;
$$ LANGUAGE plpgsql;

drop trigger IF EXISTS trigger_update_forum_users ON threads;
drop trigger IF EXISTS trigger_update_forum_users ON posts;

create trigger trigger_update_forum_users
    after insert
    on threads
    for each row
EXECUTE procedure update_forum_users();
create trigger trigger_update_forum_users
    after insert
    on posts
    for each row
EXECUTE procedure update_forum_users();
