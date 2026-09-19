-- Add a new player.
INSERT INTO players (name)
VALUES ('Magnus Carlsen');

-- Find a player by ID.
SELECT id, name, rating
FROM players
WHERE id = 1;

-- List all players, ordered by rating.
SELECT id, name, rating
FROM players
ORDER BY rating DESC;

-- Create a new tournament.
INSERT INTO tournaments (name, type)
VALUES ('MANIT Chess Championship', 'Round Robin');

-- Retrieve information about a tournament.
SELECT id, name, type, start_time, end_time
FROM tournaments
WHERE id = 1;

-- List all tournaments, newest first.
SELECT id, name, type, start_time, end_time
FROM tournaments
ORDER BY end_time DESC;

-- Register a player for a tournament.
INSERT INTO tournament_players (tournament_id, player_id)
VALUES (1, 1);

-- List all players registered for a tournament.
SELECT p.id, p.name, p.rating
FROM tournament_players tp
JOIN players p
ON p.id = tp.player_id
WHERE tp.tournament_id = 1
ORDER BY p.rating DESC;

-- Create a team for a tournament.
INSERT INTO teams (tournament_id, name)
VALUES (1, 'Team Alpha');

-- Add a registered player to a team.
INSERT INTO team_players (team_id, player_id)
VALUES (1, 1);

-- List the players belonging to a team.
SELECT p.id, p.name, p.rating
FROM team_players tp
JOIN players p
ON p.id = tp.player_id
WHERE tp.team_id = 1
ORDER BY p.rating DESC;

-- List all rounds of a tournament.
SELECT id, round_no, bracket, start_time, end_time
FROM rounds
WHERE tournament_id = 1
ORDER BY round_no;

-- Record the result of a match.
INSERT INTO matches (round_id, white_id, black_id, result)
VALUES (1, 1, 2, 'white');

-- Record a bye when a player has no opponent in a round.
INSERT INTO byes (round_id, player_id)
VALUES (1, 1);

-- Display all match results from a tournament.
SELECT *
FROM match_results_view
WHERE tournament_id = 1
ORDER BY round_no, match_id;

-- Display all registered players and their ratings.
SELECT *
FROM tournament_players_view
WHERE tournament_id = 1
ORDER BY rating DESC;

-- Count the number of registered players.
SELECT COUNT(*) AS player_count
FROM tournament_players
WHERE tournament_id = 1;

-- Count the number of matches played in a particular tournament
SELECT COUNT(*) AS match_count
FROM matches m
JOIN rounds r
ON r.id = m.round_id
WHERE r.tournament_id = 1;

-- Find the highest-rated participant.
SELECT p.id, p.name, p.rating
FROM tournament_players tp
JOIN players p
ON p.id = tp.player_id
WHERE tp.tournament_id = 1
ORDER BY p.rating DESC
LIMIT 1;

-- Mark a tournament as finished.
UPDATE tournaments
SET end_time = CURRENT_TIMESTAMP
WHERE id = 1;

-- Mark the final round as finished.
UPDATE rounds
SET end_time = CURRENT_TIMESTAMP
WHERE id = 1;

-- Delete a tournament and its dependent tournament data.
-- Related rows are removed through ON DELETE CASCADE.
DELETE FROM tournaments
WHERE id = 1;
