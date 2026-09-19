-- Active: 1786379111953@@127.0.0.1@3306@chess
CREATE DATABASE chess;
USE chess;
CREATE TABLE players(
    id INT AUTO_INCREMENT,     
    name VARCHAR(30) NOT NULL,     
    rating INT NOT NULL DEFAULT 1200,     
    PRIMARY KEY(id) 
);

CREATE TABLE tournaments(
	id INT AUTO_INCREMENT,
    name VARCHAR(30) NOT NULL,
    type ENUM('Knockout','Round Robin','Double Round Robin','Scheveningen') NOT NULL, 
    start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    end_time DATETIME DEFAULT NULL,
    PRIMARY KEY(id)
);

CREATE TABLE tournament_players(
	tournament_id INT NOT NULL,
    player_id INT NOT NULL,
    FOREIGN KEY(tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
    FOREIGN KEY(player_id) REFERENCES players(id),
    PRIMARY KEY(tournament_id,player_id)
);

CREATE TABLE teams(
    id INT AUTO_INCREMENT,
    tournament_id INT NOT NULL,
    name VARCHAR(30) NOT NULL,
    PRIMARY KEY(id),
    FOREIGN KEY(tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
    UNIQUE KEY(tournament_id,name)
);

CREATE TABLE team_players(
    team_id INT NOT NULL,
    player_id INT NOT NULL,
    PRIMARY KEY(team_id,player_id),
    FOREIGN KEY(team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY(player_id) REFERENCES players(id)
);

CREATE TABLE rounds(
	id INT AUTO_INCREMENT,
    tournament_id INT NOT NULL,
    round_no INT NOT NULL,
    bracket ENUM('Main','Consolation') NOT NULL,
    start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    end_time DATETIME DEFAULT NULL,
    PRIMARY KEY(id),
    FOREIGN KEY(tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
    UNIQUE KEY(tournament_id,round_no)
);

CREATE TABLE matches(
	id INT AUTO_INCREMENT,
    round_id INT NOT NULL,
    white_id INT NOT NULL,
    black_id INT NOT NULL,
    result ENUM('white','black','draw') DEFAULT NULL,
    PRIMARY KEY(id),
    FOREIGN KEY(round_id) REFERENCES rounds(id) ON DELETE CASCADE,
    FOREIGN KEY(white_id) REFERENCES players(id),
    FOREIGN KEY(black_id) REFERENCES players(id),
    UNIQUE KEY(round_id,white_id,black_id),
    CONSTRAINT CHECK(white_id<>black_id)
);

CREATE TABLE byes(
    round_id INT NOT NULL,
    player_id INT NOT NULL,
    FOREIGN KEY(round_id) REFERENCES rounds(id) ON DELETE CASCADE,
    FOREIGN KEY(player_id) REFERENCES players(id),
    PRIMARY KEY(round_id,player_id)
);

CREATE TABLE standings (
    tournament_id INT NOT NULL,
    player_id INT NOT NULL,
    `rank` INT DEFAULT NULL,
    matches INT NOT NULL DEFAULT 0,
    wins INT NOT NULL DEFAULT 0,
    losses INT NOT NULL DEFAULT 0,
    draws INT NOT NULL DEFAULT 0,
    byes INT NOT NULL DEFAULT 0,
    points DECIMAL(4,1) DEFAULT NULL,
    SB DECIMAL(6,1) DEFAULT NULL,
    rating INT NOT NULL DEFAULT 1200,
    FOREIGN KEY(tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
    FOREIGN KEY(player_id) REFERENCES players(id),
    PRIMARY KEY(tournament_id,player_id)
);

DELIMITER //
CREATE TRIGGER check_player_round
BEFORE INSERT ON matches
FOR EACH ROW
BEGIN
    IF EXISTS (
        SELECT 1
        FROM matches
        WHERE round_id = NEW.round_id
        AND (
            white_id = NEW.white_id
            OR black_id = NEW.white_id
            OR white_id = NEW.black_id
            OR black_id = NEW.black_id
        )
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT =
            'A player cannot participate in more than one match in the same round';
    END IF;
END//
DELIMITER ;

DELIMITER // 
CREATE TRIGGER check_bye_round
BEFORE INSERT ON byes 
FOR EACH ROW 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM byes 
        WHERE player_id = NEW.player_id
        AND round_id = NEW.round_id 
    ) THEN 
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT =
    'A player cannot receive more than one bye in the same round';
    END IF;
END //
DELIMITER;

CREATE INDEX idx_standings_tournament_points
ON standings(tournament_id, points DESC, SB DESC);

CREATE VIEW match_results_view AS
SELECT
    r.tournament_id,
    r.round_no,
    m.id AS match_id,
    w.name AS white_player,
    b.name AS black_player,
    m.result
FROM matches m
JOIN rounds r
    ON r.id = m.round_id
JOIN players w
    ON w.id = m.white_id
JOIN players b
    ON b.id = m.black_id;

CREATE VIEW tournament_players_view AS
SELECT
    t.id AS tournament_id,
    t.name AS tournament_name,
    p.id AS player_id,
    p.name AS player_name,
    p.rating
FROM tournaments t
JOIN tournament_players tp
    ON tp.tournament_id = t.id
JOIN players p
    ON p.id = tp.player_id;