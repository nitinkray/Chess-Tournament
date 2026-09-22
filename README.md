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
- **Full database design** — normalized schema with triggers, views, and indexing (see [DESIGN.md](./DESIGN.md))

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

## 📦 Prerequisites

- [Node.js](https://nodejs.org/) (recommended v18 or later)
- A running [MySQL](https://www.mysql.com/) server

## 🚀 Getting Started

### 1. Clone & install

```bash
git clone <your-repo-url>
cd "Chess Tournament"
npm install
```

### 2. Configure the environment

Create a `.env` file in the project root:

```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=chess
```

### 3. Set up the database

Run the schema script against MySQL (creates the `chess` database, all tables, triggers, views, and indexes):

```bash
mysql -u root -p < server.sql
```

### 4. Add players

Add players to the `players` table before starting a tournament. You can do this manually or with the example queries in [`queries.sql`](./queries.sql):

```sql
INSERT INTO players (name) VALUES ('Magnus Carlsen');
```

### 5. Run a tournament

```bash
npm start
```

You'll be prompted for:

1. **Tournament type** — `Knockout`, `Round Robin`, `Double Round Robin`, or `Scheveningen`
2. **Player IDs** — comma-separated (validated: positive integers, existing players, no duplicates)
   - For *Scheveningen*, you'll enter IDs for Team A and then Team B (must be equal size, no overlap)

The simulator then plays every round with a short delay between matches, prints results, stores everything in MySQL, and displays final standings.

## 📁 Project Structure

```
├── main.js            # Entry point — prompts for tournament type and dispatches
├── server.js          # MySQL connection pool (reads .env)
├── input.js           # Interactive readline prompts & player-ID validation
├── tournament.js      # Shared engine: pairing, color balance, byes, Elo rating,
│                      #   Sonneborn–Berger, match recording, round/tournament lifecycle
├── knockout.js        # Knockout tournament (main + consolation brackets)
├── RoundRobin.js      # Round Robin & Double Round Robin
├── scheveningen.js    # Scheveningen team-based tournament
├── server.sql         # Database schema: tables, triggers, views, index
├── queries.sql        # Example CRUD/analytics queries
├── DESIGN.md          # Database design document
└── Tournament.png     # ER diagram
```

## 🗄 Database Overview

**Tables** — `players`, `tournaments`, `tournament_players`, `teams`, `team_players`, `rounds`, `matches`, `byes`, `standings`

**Triggers**
- `check_player_round` — prevents a player from playing more than once per round
- `check_bye_round` — prevents a player from receiving more than one bye per round

**Views**
- `match_results_view` — readable match results with player names
- `tournament_players_view` — tournament participants with their ratings

**Index** — `idx_standings_tournament_points` on `standings(tournament_id, points DESC, SB DESC)`

> Detailed schema design, relationships, and limitations are documented in [`DESIGN.md`](./DESIGN.md).

## 📝 Notes & Limitations

- Match results are **simulated** (probability-based), not played by a real engine — the app does not store moves, positions, or PGN.
- The application (not the database) enforces pairing, color-balancing, and rating calculations.
- Byes award the player 1 point in the standings.

## 📜 License

This project is licensed under the **ISC License**.