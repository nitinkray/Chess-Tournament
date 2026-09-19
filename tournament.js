import pool from "./server.js";

import {input_ids} from "./input.js";

export const shuffle = (arr) => {
    let n = arr.length;
    for (let i = n-1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i+1)); // Math.random() generates a number between [0,1) 
        [arr[i],arr[j]] = [arr[j],arr[i]]; 
    }
};

export const delay = (ms) => {return new Promise(resolve => setTimeout(resolve, ms));};

export const random = (white, black, players) => {
    const w_r = players[white].rating;
    const b_r = players[black].rating;
    
    const e = 1 / (1 + 10 ** ((b_r - w_r) / 400));

    const draw = 0.10;
    const whiteWin = e * (1 - draw);
    const r = Math.random();

    if (r < whiteWin) return 1;
    if (r < whiteWin + draw) return 0.5;

    return 0;                                     
};

export const exec = async (conn, sql, params, errMsg) => {
    try {
        const [result] = await conn.execute(sql, params);
        return result;
    } catch (err) {
        console.error(errMsg);
        // console.error(err);
        throw err;
    }
};

export const tournament_registration = async (connection,playerIds,t_name,t_type)=>{

    const ids = await input_ids(connection,"Enter player IDs (comma-separated): ");

    playerIds.push(...ids);

    const rows = await exec(
        connection,
        "INSERT INTO tournaments(name,type) VALUES (?,?);",
        [t_name,t_type],
        "Failed to register the tournament"
    );

    const t_id = rows.insertId;
    
    await player_registration(connection,playerIds,t_id);

    return t_id;
};

export const player_registration = async (connection,playerIds,t_id)=>{
    for(let player of playerIds){
        if (player==='bye') {continue;}
        
        await exec(
            connection,
            "INSERT INTO tournament_players(tournament_id,player_id) VALUES (?,?);",
            [t_id,player],
            "Failed to insert tournament players"
        );
    }
};

export const player_object = async (connection,playerIds) => {
    const ids = playerIds.filter(id => id !== 'bye');
    const placeholders = ids.map(() => '?').join(',');

    const result = await exec(connection,
        `SELECT id,name,rating FROM players WHERE id IN (${placeholders}) ORDER BY rating DESC;`,
        ids,
        "Failed to extract ratings for the players object"
    );

    const players = {};

    for (let row of result) {
        players[row.id] = {
            name: row.name,
            points: 0,
            opponents: [],
            rating: row.rating,
            color: [0],
            matches: 0,
            wins: 0,
            losses: 0,
            byes: 0,
            draws: 0,
            sum: 0
        };
    }

    return players;
};

export const round_registration = async (connection,t_id,round_no,bracket)=>{
    const rows = await exec(
        connection,
        "INSERT INTO rounds(tournament_id,round_no,bracket) VALUES (?,?,?);",
        [t_id,round_no,bracket],
        "Failed to insert round's record"
    );
    let round_id = rows.insertId;
    process.stdout.write(`\n\nRound ${round_no} (${bracket})\n`);
    return round_id;
};

export const byes = async (connection,round_id,left,right,players)=>{
    let player_id;
    if (left==='bye'){
        player_id = right;
    }
    else if (right==='bye'){
        player_id = left;
    }
    else {
        return false;
    }

    await delay(700);

    process.stdout.write(`${players[player_id].name} receives a bye \n`);

    await exec(connection,
        "INSERT INTO byes(round_id,player_id) VALUES (?,?);",
        [round_id,player_id],
        "Failed to insert bye's record");

    players[player_id].points++;
    players[player_id].byes++;

    return player_id;
};

export const colour = (players,left,right)=>{
    const index = players[left].opponents.findIndex(o => o.id === right);
    if (index!==-1){
        if (players[left].color[index+1]==='W'){
            return [right,left];
        }
        else {
            return [left,right];
        }
    }
    const l = players[left].color;
    const r = players[right].color;
    const l_w = l[0], r_w = r[0];
    const l_b = l.length - l_w - 1, r_b = r.length - r_w - 1;
    if (l_w>r_w) {
        return [right,left];
    }
    else if (r_w>l_w){
        return [left,right];
    }
    else if (l_b>r_b){
        return [left,right];
    }
    else if (l_b<r_b){
        return [right,left];
    }
    else if (l.at(-1)==='B' && r.at(-1)==='W'){
        return [left,right];
    }
    else if (l.at(-1)==='W' && r.at(-1)==='B') {
        return [right,left];
    }
    else {
        if (left<right){
            return [left,right];
        }
        else {
            return [right,left];
        }
    }
};

export const rating = (white,black,s,players) => {
    const w_r = players[white].rating;
    const b_r = players[black].rating;
    
    const ELO_K = 20;
    const e = 1/(1+10**((b_r-w_r)/400));
    const change = Math.round(ELO_K*(s-e));

    players[white].rating += change;
    players[black].rating -= change;
    
};

export const matches = async (connection,round_id,white,black,players,random)=>{
    await delay(700);

    process.stdout.write(`${players[white].name}(white) vs ${players[black].name}(black) | `);

    let s = random(white,black,players);

    let winner;
    let w_id;
    let l_id;
    if (s===0) {
        winner = 'black';
        w_id = black;
        l_id = white;
        process.stdout.write(`${players[black].name} won\n`);
        players[black].wins++;
        players[white].losses++;
    }
    else if (s===0.5) {
        winner = 'draw';
        w_id = null;
        l_id = null;
        process.stdout.write(`DRAW\n`);
        players[white].draws++;
        players[black].draws++;
    }
    else {
        w_id = white;
        l_id = black;
        winner = 'white';
        process.stdout.write(`${players[white].name} won\n`);
        players[white].wins++;
        players[black].losses++;
    }

    await exec(connection,
    "INSERT INTO matches(round_id,white_id,black_id,result) VALUES (?,?,?,?);",
    [round_id,white,black,winner],
    "Failed to insert match record");

    players[white].matches++;
    players[white].points += s;
    players[white].opponents.push({ id: black, score: s });      
    players[white].color.push('W');
    players[white].color[0]++;

    players[black].matches++;
    players[black].points += 1-s;
    players[black].opponents.push({ id: white, score: 1 - s }); 
    players[black].color.push('B');

    rating(white,black,s,players);

    return [w_id,l_id];
};

export const end_round = async (connection,r_id)=>{
    await exec(connection,
    "UPDATE rounds SET end_time=CURRENT_TIMESTAMP WHERE id = ?;",
    [r_id],
    "Failed to update round's endtime");
};

export const end_tournament = async (connection,t_id)=>{
    await exec(connection,
    "UPDATE tournaments SET end_time=CURRENT_TIMESTAMP WHERE id = ?;",
    [t_id],
    "Failed to update tournament's endtime");
};

export const sonneborn_berger = (players) => {
    for (const id in players) {
        players[id].sum = players[id].opponents.reduce(
            (acc, game) => acc + game.score * (players[game.id].points-players[game.id].byes),
            0 // acc is accumulated SBs
        );
    }
};

export const update_ratings = async (connection,players)=>{
    for(let player in players){
        await exec(connection,
        "UPDATE players SET rating = ? WHERE id = ?;",
        [players[player].rating,player],
        "Failed to update player rating");
    }
};

