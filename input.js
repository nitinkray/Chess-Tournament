import * as readline from "node:readline";

function ask(rl,q) {
    return new Promise(resolve => {
        rl.question(q, (answer) => { 
        resolve(answer);
        });
    });
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// When exported, input_ids function remembers its parent scope environment(closure) and thus can use 
// ask function and import readline but these cannot be accessed by files which imports input_ids
export async function input_ids(connection,question) {

    const playerInput = await ask(
        rl,
        question
    );

    const ids = playerInput
        .split(",")
        .map(id => id.trim());

    if (ids.length < 2) {
        throw new Error("At least two players are required.");
    }

    // Regular expression for ids to be positive integers
    if (ids.some(id => !/^[1-9]\d*$/.test(id))) {
        throw new Error("Player IDs must be positive integers.");
    }

    // Convert strings to numbers after validation
    const playerIds = ids.map(id => Number(id));

    // No duplicate player IDs
    if (new Set(playerIds).size !== playerIds.length) {
        throw new Error("Duplicate player IDs are not allowed.");
    }

    // Check that every player exists in the database.
    const placeholders = playerIds.map(() => "?").join(",");

    const [rows] = await connection.execute(
        `SELECT id
            FROM players
            WHERE id IN (${placeholders});`,
        playerIds
    );

    const found = new Set(rows.map(r => r.id));
    const missing = playerIds.filter(id => !found.has(id));

    if (missing.length > 0) {
        throw new Error(`Player ID(s) do not exist: ${missing.join(", ")}`);
    }
    
    return playerIds;
}

export async function input_t(){
    const t_type = await ask(
        rl,
        "Enter the tournament type: "
    );

    if (t_type!=='Knockout' && t_type!=='Round Robin' && t_type!=='Double Round Robin' && t_type!=='Scheveningen'){
        throw new Error("Tournament Type should be Knockout, Round Robin, Double Round Robin or Scheveningen");
    }

    return t_type;
}

export const close_input = () => rl.close();
// rl.close();