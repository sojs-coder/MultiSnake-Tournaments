const AWS = require("aws-sdk");
const { createClient } = require("@supabase/supabase-js");
const { guid } = require("./helpers.js")

AWS.config.update({
    region: "us-west-2",
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});
class TourneyManager {
    constructor(entry_fee) {
        this.supabaseUrl = "https://aurcjoehedrtjdasadyt.supabase.co"
        this.supabase = createClient(this.supabaseUrl, process.env.SUPAKEY);
    }
    async getTourneysFromPlayer(player_uid) {
        let { data: tourneys, error } = await this.supabase
            .from("users")
            .select("tourneys")
            .eq("uid", player_uid);
        if (error) {
            console.error(error);
            return { error: true, message: error.message }
        };
        return tourneys;
    }
    async getUserByEmail(email) {
        let { data: user, error } = await this.supabase
            .from("users")
            .select("*")
            .eq("email", email);
        if (error) {
            console.error(error);
            return { error: true, message: error.message }
        };
        return user;
    }
    async getUser(uid) {
        let { data: user, error } = await this.supabase
            .from("users")
            .select("*")
            .eq("uid", uid);
        if (error) {
            console.error(error);
            return { error: true, message: error.message }
        };
        return user;
    }
    async putUser({ uid, username, elo, email, passwordHash, verified }) {
        var user = { uid, username, elo, email, passwordHash, verified }
        const { data, error } = await this.supabase
            .from('users')
            .upsert(user)
            .select();
        if (error) {
            console.error(error);
            return { error: true, message: error.message }
        }
        return data
    }
    async getUnactiveTourneys() {
        let { data: games, error } = await this.supabase
            .from('games')
            .select('*')
            .is('ongoing', false)
            .is('complete', false)
        if (error) {
            console.error(error);
            return { error: true, message: error.message }
        };
        return games;
    }
    async getGamesFromTourney(tourney) {
        let { data: games, error } = await this.supabase
            .from('games')
            .select('*')
            .eq('tourney', tourney)
        if (error) {
            console.error(error);
            return { error: true, message: error.message }
        };
        return games;
    }
    async updateEntryFee(tourney, entry_fee) {
        let { error } = await this.supabase
            .from('tourneys')
            .update({ entry_fee })
            .eq("uid", tourney)
        if (error) {
            console.error(error);
            return { error: true, message: error.message }
        };
    }
    async getTourney(uid) {
        let { data: tourneys, error } = await this.supabase
            .from('tourneys')
            .select('*')
            .eq('uid', uid)
        if (error) {
            console.error(error);
            return { error: true, message: error.message }
        };
        return tourneys[0];
    }
    async getGame(uid) {
        let { data: games, error } = await this.supabase
            .from('games')
            .select('*')
            .eq('uid', uid)
        if (error) {
            console.error(error);
            return { error: true, message: error.message }
        };
        return games[0];
    }
    async getOngoingGames() {
        let { data: games, error } = await this.supabase
            .from('games')
            .select("*")
            .is('ongoing', true);
        if (error) {
            console.error(error);
            return { error: true, message: error.message }
        };
        return games[0];
    }
    async getPlayersFromTourney(uid) {
        let { data: players, error } = await this.supabase
            .from('tourneys')
            .select("players")
            .eq("uid", uid)
        if (error) {
            console.error(error);
            return { error: true, message: error.message }
        };
        return players[0].players;
    }
    async removePlayer(tourneyUID, playerUID) {
        var { players, live_players, prize, ongoing, complete, entry_fee } = await this.getTourney(tourneyUID);
        if (players) {
            if (!ongoing && !complete) {
                players = players.filter((u) => {
                    return u !== playerUID
                });
                live_players = live_players.filter((u) => {
                    return u !== playerUID
                });
                prize -= entry_fee
                await this.supabase
                    .from('tourneys')
                    .update({ players, live_players, prize })
                    .eq('uid', tourneyUID)
            } else {
                return { error: true, message: "Tournament has started" }
            }
        } else {
            return { error: true, message: "tourney does not exist" };
        }
    }
    async getLivePlayers(uid) {
        let { data: live_players, error } = await this.supabase
            .from('tourneys')
            .select("live_players")
            .eq("uid", uid)
        if (error) {
            console.error(error);
            return { error: true, message: error.message }
        };
        return live_players[0].live_players;
    }
    async startTournament(uid) {
        var { live_players: stillIn, start_at, max_games_per_day, game_hour_diff, round_num } = await this.getTourney(uid);
        stillIn = await Promise.all(stillIn.map(async (puid) => {
            return dbManager.getUser(puid)
        }));
        stillIn = stillIn.map(user => {
            return {
                uid: user.uid,
                username: user.username,
                verified: user.verified,
                elo: user.elo || 400
            }
        })
        stillIn.sort((a, b) => {
            return a.elo - b.elo
        });
        var groups = this.group(stillIn, 4);
        // https://www.unixtimestamp.com/
        var games = await this.createRound(uid, groups, start_at, max_games_per_day, game_hour_diff, round_num+1);
        var { data, error } = this.supabase
            .from("tourneys")
            .update({ ongoing: true })
            .eq("uid", uid)
    }
    async createRound(tourney, groups, game_start, max_games_day, gameHourDiff, round_num) {
        var roundUID = guid();
        var currentTime = game_start;
        var gamesToday = 0;
        var add24Hours = (t) => t + (1000 * 60 * 60 * 24);
        var addXHours = (t, x) => t + (1000 * 60 * 60 * x);
        var games = groups.map(players => {
            players = players.map(p => p.uid)
            var game = {
                uid: guid(),
                winner: null,
                start_at: currentTime,
                complete: false,
                tourney,
                ongoing: false,
                players,
                link: `https://multisnake.xyz/play/location_${guid()}?type=tourney`,
                round: roundUID
            }
            gamesToday++;
            currentTime = addXHours(currentTime, gameHourDiff);
            if (gamesToday >= max_games_day) {
                currentTime = add24Hours(game_start);
                game_start = currentTime;
                gamesToday = 0;
            }
            return game
        })
        const { data, error } = await this.supabase
            .from('games')
            .insert(
                games
            )
            .select();
        var round = {
            uid: roundUID,
            timestamp: new Date().getTime(),
            num_games: games.length,
            num_players: groups.flat().length,
            round_num
        }
        const { d, e } = await this.supabase
            .from("rounds")
            .insert(round)
            .select()
        if (error) {
            console.error(error);
            return { error: true, message: error.message }
        };
        return { data }
    }
    async createGame(players, start_at, tourney) {
        var game = {
            uid: guid(),
            winner: null,
            start_at,
            complete: false,
            tourney,
            ongoing: false,
            players,
            link: `https://multisnake.xyz/play/location_${guid()}?type=tourney`
        }
        const { data, error } = await this.supabase
            .from('games')
            .insert([
                game
            ])
            .select();
        if (error) {
            console.error(error);
            return { error: true, message: error.message }
        };
        return { data, uid: game.uid }
    }
    group(players, size) {
        var groups = [];
        for (var i = 0; i < players.length; i++) {
            if (i % size == 0) groups.push([]);
            groups[groups.length - 1].push(players[i])
        }
        return groups
    }
    async playerInTourney(tourney, player) {
        var players = await this.getPlayersFromTourney(tourney);
        if (players.error) return players
        return (players.indexOf(player) !== -1)
    }
    async addPlayer(tourneyUID, playerUID) {
        var { players, live_players, prize, ongoing, complete, entry_fee } = await this.getTourney(tourneyUID);
        if (players) {
            if (!ongoing && !complete) {
                prize += entry_fee;
                if (players.indexOf(playerUID) !== -1) return { error: true, message: "Player already in the tourney" }
                players.push(playerUID);
                live_players.push(playerUID);
                await this.supabase
                    .from('tourneys')
                    .update({ players, live_players, prize })
                    .eq('uid', tourneyUID);
            } else {
                return { error: true, message: "Tournament has started" }
            }
        } else {
            return { error: true, message: "tourney does not exist" };
        }
    }
    async getActiveTourneys() {
        var { data: tourneys, error } = await this.supabase
            .from("tourneys")
            .select("*")
            .is('ongoing', true)
        if (error) {
            console.error(error);
            return { error: true, message: error.message }
        };
        return tourneys
    }
    async getCompleteTourneys() {
        var { data: tourneys, error } = await this.supabase
            .from("tourneys")
            .select("*")
            .is('complete', true)
        if (error) {
            console.error(error);
            return { error: true, message: error.message }
        };
        return tourneys
    }
    async finishGame(gameID, winner) {
        var { players, tourney } = await this.getGame(gameID);
        var deadPlayers = players.filter(player => {
            return player !== winner;
        });
        // finish here remove dead players from live_players from `tourney.live_players`
        // add all dead players to `tourney.ranked_players`
        var { data, error } = await this.supabase
            .from('games')
            .update({ complete: true, winner })
            .eq("uid", gameID);
        if (error) {
            console.error(error);
            return { error: true, message: error.message }
        };
        return data
    }
    async startGame(gameID) {
        var { data, error } = await this.supabase
            .from('games')
            .update({ ongoing: true })
            .eq("uid", gameID);
        if (error) {
            console.error(error);
            return { error: true, message: error.message }
        };
        return data

    }
    async createTourney(entry_fee, start_at, max_games_per_day, game_hour_diff, friendlyName) {
        var tourney = {
            uid: guid(),
            name: friendlyName,
            players: [],
            entry_fee,
            prize: 0,
            ongoing: false,
            complete: false,
            start_at,
            winner: null,
            max_games_per_day,
            game_hour_diff,
            round_num: 0,
            on_round: null
        }
        const { data, error } = await this.supabase
            .from('tourneys')
            .insert([
                tourney
            ])
            .select();
        if (error) {
            console.error(error);
            return { error: true, message: error.message }
        };
        return { data, uid: tourney.uid }
    }
}

class DBManager {
    constructor() {
        this.TABLE_NAME = "multisnake";
        const DynamoDB = new AWS.DynamoDB();
        this.dynamoClient = new AWS.DynamoDB.DocumentClient();
    }
    async updateElo(uid, elo) {
        const params = {
            TableName: this.TABLE_NAME,
            Key: {
                uid
            },
            UpdateExpression: "SET #e = :newElo",
            ExpressionAttributeNames: {
                "#e": "elo"
            },
            ExpressionAttributeValues: {
                ":newElo": elo
            }
        };

        try {
            const data = await this.dynamoClient.update(params).promise();
            return data;
        } catch (err) {
            console.log(err);
        }
    }
    async getElo(uid) {
        const params = {
            TableName: this.TABLE_NAME,
            Key: {
                uid
            },
            ProjectionExpression: "elo"
        };

        try {
            const data = await this.dynamoClient.get(params).promise();
            return data.Item;
        } catch (err) {
            console.log(err);
        }
    }
    async isVerified(uid) {
        const params = {
            TableName: this.TABLE_NAME,
            Key: {
                uid
            },
            ProjectionExpression: "verified"
        };

        try {
            const data = await this.dynamoClient.get(params).promise();
            const isVerified = data.Item.verified;
            return isVerified === true;
        } catch (err) {
            console.log(err);
        }
    }
    async getDataByEmail(email) {
        const params = {
            TableName: this.TABLE_NAME,
            IndexName: "email-index",
            ExpressionAttributeValues: {
                ":e": email
            },
            KeyConditionExpression: "email = :e"
        };
        try {
            const data = await this.dynamoClient.query(params).promise();
            return data;
        } catch (err) {
            console.log(err);
        }
    }
    async getUser(uid) {
        const params = {
            TableName: this.TABLE_NAME,
            Key: {
                uid
            }
        };

        try {
            const data = await this.dynamoClient.get(params).promise();
            return data.Item;
        } catch (err) {
            console.log(err);
        }
    }
}


const dbManager = new DBManager();
const tManager = new TourneyManager();
module.exports = {
    dbManager,
    tManager
}
