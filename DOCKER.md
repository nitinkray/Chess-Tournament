# 🐳 Running with Docker

No Node.js or MySQL install needed — everything runs from the project root.

## 1. Start (first time, and after any `package.json` / `Dockerfile` change)

```bash
docker compose up -d --build        # MySQL starts, app image builds
```

`src/` is bind-mounted into the `app` container, so edits to `src/*.js` are picked up on the next run — rebuild (`--build`) only after changing `package.json` or the `Dockerfile`.

MySQL creates the `chess` database and runs, **on the first start only**:

- `sql/schema.sql` -> 9 tables, 2 views, 1 trigger, 1 index
- `sql/seed.sql`   -> 31 players (IDs 1..31)

> Schema/seed edits only apply to a FRESH volume: run `docker compose down -v` first.

## 2. Play a tournament (interactive)

```bash
docker compose exec app node src/main.js
```

Prompts for the format (Knockout / Round Robin / Double Round Robin / Scheveningen),
then comma-separated player IDs, e.g.  1,6,2,17,19 .
One tournament per run — rerun as often as you like.

Need a shell?      docker compose exec app sh          # then: node src/main.js

One-off instead:   docker compose run --rm play        # no keep-alive container needed

`app` bind-mounts `./src` (live edits); `play` runs the image's own copy of `src/`, so use `docker compose run --build --rm play` after changing the code.

## 3. Query the database

Interactive session (recommended):

    docker compose exec -e MYSQL_PWD=chess db mysql -A -s -t -uroot chess
      mysql> SELECT COUNT(*) AS players FROM players;
      mysql> SELECT * FROM standings ORDER BY `rank`;
      mysql> exit

Single query (one-shot, nothing to exit):

    docker compose exec -T -e MYSQL_PWD=chess db mysql -A -t -uroot chess -e "SELECT COUNT(*) AS players FROM players;"

The root password defaults to `chess` (`MYSQL_ROOT_PASSWORD`, overridable in `.env`).

## 4. Logs & maintenance

    docker compose ps                         # health of db + app
    docker compose logs -f db                 # watch schema + seed init
    docker compose down                       # stop everything (data persists)
    docker compose down -v                    # stop + WIPE the DB volume (fresh start)

Verify a full init — both files must appear (no host `grep` needed):

    docker compose logs db                                  # look for 01-schema.sql and 02-seed.sql
    docker compose exec -T db ls /docker-entrypoint-initdb.d

    (PowerShell) docker compose logs db | Select-String initdb.d
    (bash)       docker compose logs db | grep initdb.d

## 5. Running the app on the host (no Docker)

`src/server.js` reads the connection settings from the environment (via `dotenv`), so create a `.env` in the project root:

    DB_HOST=127.0.0.1
    DB_PORT=3307        # the port this compose file publishes; 3306 = a MySQL installed on the host
    DB_USER=root
    DB_PASSWORD=chess
    DB_NAME=chess

Then:

    npm install
    npm start           # = node src/main.js

Inside Docker no `.env` is needed: compose injects the same variables with `DB_HOST=db` / `DB_PORT=3306` for `app` and `play`. (`.env.example` only carries the optional `MYSQL_ROOT_PASSWORD` for the `db` service.)
