# ♟️ Chess Tournament Simulator

A **Node.js + MySQL** application that simulates complete chess tournaments across four formats — **Knockout**, **Round Robin**, **Double Round Robin**, and **Scheveningen** — with match simulation, Elo ratings, Sonneborn–Berger scoring, and persistent standings stored in a relational database.

## ✨ Features

- **Four tournament formats** — Knockout, Round Robin, Double Round Robin, and Scheveningen (team-based)
- **Elo-based match simulation** — outcomes are decided probabilistically from player ratings, with a 10% draw chance
- **Live Elo rating updates** — ratings are updated after every match (K = 20 on the standard 400-point scale)
- **Sonneborn–Berger scoring** — standings are ranked by points, then by SB score using `DENSE_RANK`
- **Color balancing** — players are assigned White/Black to balance colors across the tournament
- **Byes** — handled automatically when an odd number of players or a knockout bracket requires it
- **Randomized tournament & team names** — every event gets a themed name (e.g., *The Grand Gambit*, *Knight Riders*)
- **Interactive CLI** — prompts for tournament type and player IDs with full input validation
- **Transactional integrity** — tournament data is committed or rolled back as a unit on failure
- **Full database design** — normalized schema with triggers, views, and indexing (see [DESIGN.md](./sql/DESIGN.md))

## 🏆 Supported Tournament Formats

| Format              | Description                                                                          |
| ------------------- | ------------------------------------------------------------------------------------ |
| **Knockout**        | Single-elimination with main & consolation brackets; byes fill the bracket to a power of 2 |
| **Round Robin**     | Every player faces every other player once (N−1 rounds, rotation pairing)            |
| **Double Round Robin** | Every player faces every other player twice (2×(N−1) rounds)                       |
| **Scheveningen**    | Two equal-sized teams; every member of Team A plays every member of Team B           |

## 🛠 Tech Stack

- **Node.js** (ES modules)
- **MySQL** — via [`mysql2`](https://github.com/sidorares/node-mysql2) (connection pool)
- **dotenv** — environment configuration
- **docker** — environment containerization

## 🚀 Getting Started

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/nitinkray/Chess-Tournament)

Setup, running tournaments, querying the database, logs, and running without Docker are all covered in **[DOCKER.md](./DOCKER.md)** — start there.

```bash
docker compose up -d --build                 # MySQL 8.4 + app image
docker compose exec app node src/main.js     # play a tournament
docker compose exec -e MYSQL_PWD=chess db mysql -A -s -t -uroot chess # run mysql queries
```

No local Node.js or MySQL install is needed — and with a Codespace you don't even need Docker Desktop: Node 24, Docker and MySQL all run in the cloud, so you can open the repo and start testing straight away. To point the app at your own MySQL instead, see §5 of **[DOCKER.md](./DOCKER.md)**.

You'll be prompted for:

1. **Tournament type** — `Knockout`, `Round Robin`, `Double Round Robin`, or `Scheveningen`
2. **Player IDs** — comma-separated (validated: positive integers, existing players, no duplicates)
   - For *Scheveningen*, you'll enter IDs for Team A and then Team B (must be equal size, no overlap)
   - 31 demo players ship in `sql/seed.sql` (IDs 1–31); add more with the example queries in `sql/queries.sql`

The simulator then plays every round with a short delay between matches, prints results, stores everything in MySQL, and displays final standings.

## 📁 Project Structure

```
Chess Tournament/
├── src/                     # Application (Node.js, ES modules)
│   ├── main.js              # Entry point — prompts for the tournament type and dispatches
│   ├── input.js             # Interactive readline prompts & player-ID validation
│   ├── tournament.js        # Shared engine: pairing, color balance, byes, Elo rating,
│   │                        #   Sonneborn–Berger, match recording, round/tournament lifecycle
│   ├── knockout.js          # Knockout tournament (main + consolation brackets)
│   ├── RoundRobin.js        # Round Robin & Double Round Robin (rotation pairing)
│   ├── scheveningen.js      # Scheveningen team-based tournament (Team A vs Team B)
│   ├── server.js            # MySQL connection pool (reads .env)
│   └── seed.js              # Pools of random tournament & team names
├── sql/
│   ├── schema.sql           # Database schema: 9 tables, triggers, views, index
│   ├── seed.sql             # Demo data — 31 players
│   ├── queries.sql          # Example CRUD/analytics queries
│   ├── DESIGN.md            # Database design document
│   └── Tournament.png       # ER diagram
├── scripts/wait-for-db.js   # Waits for MySQL before the app starts (container CMD)
├── .devcontainer/           # VS Code / Codespaces dev container (Node 24 + Docker-in-Docker)
├── Dockerfile               # App image: Node 24, non-root, waits for the DB
├── compose.yaml             # db (MySQL 8.4, host port 3307) + app service
├── DOCKER.md                # How to run everything with Docker  ← start here
├── .env.example             # Optional MySQL root password for the Docker stack
└── package.json             # Scripts & dependencies (dotenv, mysql2)
```

## 🗄 Database Overview

**Tables** — `players`, `tournaments`, `tournament_players`, `teams`, `team_players`, `rounds`, `matches`, `byes`, `standings`

**Demo data** — `sql/seed.sql` loads 31 players (IDs 1–31) on the first container start.

**Triggers**
- `check_player_round` — prevents a player from playing more than once per round (a duplicate bye is already impossible via the `byes(round_id, player_id)` primary key)

**Views**
- `match_results_view` — readable match results with player names
- `tournament_players_view` — tournament participants with their ratings

**Index** — `idx_standings_tournament_points` on `standings(tournament_id, points DESC, SB DESC)`

> Detailed schema design, relationships, and limitations are documented in [`DESIGN.md`](./sql/DESIGN.md).

## 📝 Notes & Limitations

- Match results are **simulated** (probability-based), not played by a real engine — the app does not store moves, positions, or PGN.
- The application (not the database) enforces pairing, color-balancing, and rating calculations.
- Byes award the player 1 point in the standings.

## 📜 License

This project is licensed under the **ISC License**.