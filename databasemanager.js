const AWS = require("aws-sdk");
const { createClient } = require("@supabase/supabase-js");
const { guid } = require("./helpers.js");
const { post } = require("axios")

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
    async getRanks(limit = 500) {
        let { data: players, error } = await this.supabase
            .from("users")
            .select("*")
            .order("elo", { ascending: false, nullsFirst: false })
            .limit(limit)
        if (error) {
            console.error(error);
            return { error: true, message: error.message }
        };
        return players;
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
    async putUser({ uid, username, elo, email, passwordHash, verified, gamesPlayed, gamesWon }) {
        var user = { uid, username, elo, email, passwordHash, verified, gamesPlayed, gamesWon }
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
    async getUnactiveGames() {
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
    async getUnactiveTourneys() {
        let { data: games, error } = await this.supabase
            .from('tourneys')
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
    async restrictLocation(game_uid, location, game_start, [p1, p2, p3, p4], webhookURL) {
        try {
            var res = await post("http://localhost:3001/restrictLocation", {
                location,
                game_start,
                webhookURL,
                game_uid,
                p1,
                p2,
                p3,
                p4
            }, {
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + process.env.ROUND_KEY
                }
            });
        } catch (err) {
            console.log(err.message)
        }
    }
    async createRound({ start_at, tourney }) {
        try {
            var { uid, live_players: stillIn, start_at: tStart_at, max_games_day, game_hour_diff, round_num } = tourney;
            const tuid = uid;
            round_num += 1;
            var games = await this.getGamesFromTourney(uid);
            if (!games || games.error) return games;
            var game_number = games.length;
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

            var roundUID = guid();

            var currentTime = start_at;
            var gamesToday = 0;
            var add24Hours = (t) => t + (1000 * 60 * 60 * 24);
            var addXHours = (t, x) => t + (1000 * 60 * 60 * x);

            var games = groups.map(players => {
                players = players.map(p => p.uid);
                var game_uid = guid();
                var location = `location_${guid()}`
                var webhookURL = `https://tournaments.multisnake.xyz/multisnake_link_hook`
                var game = {
                    uid: game_uid,
                    winner: null,
                    start_at: currentTime,
                    complete: false,
                    tourney: uid,
                    ongoing: false,
                    players,
                    link: `https://multisnake.xyz/play/${location}?type=tourney&tuid=${tuid}`,
                    round: roundUID,
                    game_number: ++game_number
                }
                // send post to multisnake.xyz/restrict
                gamesToday++;
                currentTime = addXHours(currentTime, game_hour_diff);
                if (gamesToday >= max_games_day) {
                    currentTime = add24Hours(start_at);
                    start_at = currentTime;
                    gamesToday = 0;
                }
                this.restrictLocation(game_uid, location, game.start_at, players, webhookURL)
                return game;
            });
            var round = {
                uid: roundUID,
                timestamp: start_at,
                num_games: games.length,
                num_players: groups.flat().length,
                round_num: round_num,
                tourney: uid
            }
            var { data, error } = await this.supabase
                .from("rounds")
                .insert(round)
                .select();
            if (error) return { error: true, message: error.message }
            var { data, error } = await this.supabase
                .from("games")
                .insert(games)
                .select();
            if (error) return { error: true, message: error.message }
            var { data, error } = await this.supabase
                .from("tourneys")
                .update({ ongoing: true, round_num, on_round: roundUID })
                .eq("uid", uid);
            if (error) return { error: true, message: error.message, line: 295 }
            return { success: true, uid: roundUID };
        } catch (err) {
            return { error: true, message: error }
        }
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
            link: `https://multisnake.xyz/play/location_${guid()}?type=tourney?r=true`
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
    async isTourneyValid(uid) {
        var t = await this.getTourney(uid);

        if (!t || t.error) return false;
        var { ongoing, complete, start_at } = t;
        if (ongoing || complete || (new Date().getTime() > start_at)) return false;

        return true;
    }
    async addPlayer(tourneyUID, playerUID) {
        var { players, live_players, prize, ongoing, complete, entry_fee, start_at } = await this.getTourney(tourneyUID);
        var player = await this.getUser(playerUID);

        if (!player[0] || player.error) return { error: true, message: "Player does not exist" }
        player = player[0]
        if (players) {
            if (!ongoing && !complete && (new Date().getTime() < start_at)) {
                prize += entry_fee;
                if (players.indexOf(playerUID) !== -1) return { error: true, message: "Player already in the tourney" }
                players.push(playerUID);
                live_players.push(playerUID);
                player.tourneys.push(tourneyUID);
                await this.supabase
                    .from("users")
                    .update({ tourneys: player.tourneys })
                    .eq("uid", playerUID)
                await this.supabase
                    .from('tourneys')
                    .update({ players, live_players, prize })
                    .eq('uid', tourneyUID);
            } else {
                return { error: true, message: "Tournament has started" }
            }
        } else {
            return { error: true, message: "Tourney does not exist" };
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
        var { players, tourney, error, message } = await this.getGame(gameID);
        var deadPlayers = players.filter(player => {
            return player !== winner;
        });
        if (error) return message;
        var { live_players, ranked_players, error, message, prize } = await this.getTourney(tourney);
        if (error) return { error, message }
        live_players = live_players.filter(player => {
            return deadPlayers.indexOf(player) == -1;
        })
        ranked_players = ranked_players.concat(deadPlayers)
        var { data, error } = await this.supabase
            .from('games')
            .update({ complete: true, ongoing: false, winner })
            .eq("uid", gameID);
        if (error) {
            console.error(error);
            return { error: true, message: error.message }
        };

        if (live_players.length == 1) {
            var { data, error } = await this.supabase
                .from('tourneys')
                .update({ live_players, ranked_players, winner: live_players[0], complete: true, ongoing: false })
                .eq('uid', tourney)
            if (error) {
                console.error(error);
                return { error: true, message: error.message }
            };
            var userData = await this.getUser(live_players[0]);
            var user = userData[0];
            var { data, error } = await this.supabase
                .from('users')
                .update({ prizesWon: user.prizesWon + prize })
                .eq("uid", live_players[0]);
            if (error) {
                console.error(error);
                return { error: true, message: error.message }
            }
        } else {
            var { data, error } = await this.supabase
                .from('tourneys')
                .update({ live_players, ranked_players })
                .eq('uid', tourney)
            if (error) {
                console.error(error);
                return { error: true, message: error.message }
            };
        }
        return { success: true }
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
            on_round: null,
            live_players: [],
            ranked_players: [],
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
    async putWinner(gameUID, playerUID) {
        var data = await this.finishGame(gameUID, playerUID)
        return data;
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
    async sendPaymentFailed(email, { uid, name }, reason) {
        const params = {
            Destination: {
                ToAddresses: [email]
            },
            Message: {
                Body: {
                    Html: {
                        Charset: "UTF-8",
                        Data: `<h1>Hello ${email}</h1><p>You have recently signed up for the tournament ${name} (uid ${uid}). ${reason}. You will be refunded in full. </p><p>If you think this was a mistake, please <a href = "mailto:sojs@multisnake.xyz>email me</a>.</p><p>Best regards, SoJS</p>`
                    },
                    Text: {
                        Charset: "UTF-8",
                        Data: `Hello ${email}. \n You have recently signed up for the tournament ${name} (uid ${uid}). ${reason}. You will be refunded in full. If you think this was a mistake, email me. \n\nBest regards, SoJS`
                    }
                },
                Subject: {
                    Charset: "UTF-8",
                    Data: "[Multisnake Tournaments] Failed to sign up for " + name
                }
            },
            Source: "sojscoder@gmail.com",
            ReplyToAddresses: [
                "sojscoder@gmail.com"
            ]
        };
        var sendPromise = new AWS.SES({
            apiVersion: '2010-12-01'
        }).sendEmail(params).promise();
        sendPromise.then(function (data) { }).catch(function (err) { console.error(err, err.stack); });
    }
}


const dbManager = new DBManager();
const tManager = new TourneyManager();


module.exports = {
    dbManager,
    tManager
}
