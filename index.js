require("dotenv").config();
const express = require('express');
const http = require('http');
const nunjucks = require("nunjucks");
const session = require('express-session');
const { sortByTime } = require("./helpers.js")
const { resolve } = require("path");
const { dbManager, tManager } = require("./databasemanager");
const app = express();
const server = http.createServer(app);
const stripe = require("stripe")(process.env.STRIPE_SECRET)
const bodyParser = require('body-parser');
const endpointSecret = process.env.SIGN_SECRET;

const morgan = require("morgan")
app.use(express.static(
    "./public"
));
nunjucks.configure("views", {
    autoescape: true,
    express: app
});
app.use(morgan('dev'))
app.use(
    session({
        secret: process.env.KEY,
        resave: false,
        saveUninitialized: true,
        persist: true,
    })
);
app.get("/", async (req, res) => {
    const ongoingTourneys = await tManager.getActiveTourneys();
    if (ongoingTourneys.length >= 1) {
        const games = await tManager.getGamesFromTourney(ongoingTourneys[0].uid);
        for (var i = 0; i < games.length; i++) {
            var game = games[i];
            game.players = await Promise.all(game.players.map(player => {
                return dbManager.getUser(player)
            }))
        }
        res.render("activeTourneyHome.njk", {
            t: ongoingTourneys[0],
            g: games,
            user: req.session.user
        });
    } else {
        const nextTourney = await tManager.getUnactiveTourneys();
        res.render("noactiveTourneyHome.njk", {
            t: nextTourney[0],
            user: req.session.user
        });
    }
});
app.get("/login", (req, res) => {
    req.session.goto = req.query.goto
    res.render("login.njk", {
        user: req.session.user
    })
});
app.get("/signup", (req, res) => {
    res.render("signup.njk", {
        user: req.session.user
    });
});
app.get("/leaderboard", async (req, res) => {
    var ranks = await tManager.getRanks();
    ranks = ranks.map(player => {
        player.elo = player.elo || "400*"
        return player
    });

    res.render("leaderboard.njk", { ranks, user: req.session.user });
});
app.get("/logout", (req, res) => {
    delete req.session.user;
    res.redirect("/login")
})
app.get("/account/:uid", async (req, res, next) => {
    var user = await dbManager.getUser(req.params.uid);
    if (!user) return next();
    var updatedUser = await tManager.putUser(user);
    user = { ...updatedUser[0], ...user }
    user.elo = user.elo || 400
    if (req.params.uid == "c9ca879f-6511-42dd-9481-01e69c40af68") return res.render("sojs_view.njk", { ...user, user });

    var tourneys = user.tourneys;

    tourneys = await Promise.all(tourneys.map(tuid => {
        return tManager.getTourney(tuid)
    }));
    tourneys = tourneys.map(tourney => {
        var mUID = user.uid;
        var ranks = tourney.ranked_players.toReversed();

        var rank = ranks.indexOf(mUID);
        tourney.rank = rank;

        return tourney;
    })
    res.render("public_user.njk", { ...user, tourneys, user: req.session.user })
});
app.get("/account", async (req, res) => {
    if (!req.session.user) {
        return res.redirect("/login")
    }
    var user = await dbManager.getUser(req.session.user.uid);
    var updatedUser = await tManager.putUser(user);
    updatedUser = updatedUser[0]
    if (!user) return next();
    user.elo = user.elo || 400;
    var notOngoingTourneys = await tManager.getUnactiveTourneys();
    var filteredNotOngoingTourneys = notOngoingTourneys.filter(tuid => {
        if (updatedUser.tourneys == null || !updatedUser.tourneys) return true;
        return (updatedUser.tourneys.indexOf(tuid) !== -1)
    })
    var nOTourneys = await Promise.all(filteredNotOngoingTourneys.map(t => {
        return tManager.getTourney(t.uid);
    }));
    var joinedTourneys = await tManager.getTourneysFromPlayer(req.session.user.uid);
    if (!joinedTourneys[0].tourneys) joinedTourneys[0].tourneys = [];
    var jtourneys = await Promise.all(joinedTourneys[0].tourneys.map(t => {
        return tManager.getTourney(t);
    }));

    var games = await Promise.all(jtourneys.map(tourney => {
        return tManager.getGamesFromTourney(tourney.uid);
    }));
    games = games.flat();
    games = games.filter(game => game.players.indexOf(req.session.user.uid) !== -1);
    var passedGamesNum = 0;
    for (var i = 0; i < games.length; i++) {
        if (new Date().getTime() >= games[i].start_at) {
            games[i].passed = true;
            passedGamesNum++;
        }
        games[i].players = await Promise.all(games[i].players.map(playerUID => {
            return tManager.getUser(playerUID);
        }));
        games[i].players = games[i].players.map(player => {
            player = player[0]
            player.elo = player.elo || 400;
            return player;
        })
    }
    var noGamesToPlay = (passedGamesNum == games.length);
    res.render("private_user.njk", { ...user, noGamesToPlay, tourneys: jtourneys, ableToJoin: nOTourneys, user: req.session.user, games });
});
app.get("/join/:tourneyUID", (req, res) => {
    res.redirect("/checkout/" + req.params.tourneyUID)
});
app.get("/manage", async (req, res, next) => {
    var whiteList = ["c9ca879f-6511-42dd-9481-01e69c40af68"];

    if (!req.session.user) return next();
    if (whiteList.indexOf(req.session.user.uid) == -1) return next();
    var activeTourneys = await tManager.getActiveTourneys();
    var completeTourneys = await tManager.getCompleteTourneys();
    var unactiveTourneys = await tManager.getUnactiveTourneys()
    res.render("manage.njk", { activeTourneys, completeTourneys, unactiveTourneys, user: req.session.user })
});
app.get("/manage/:tourneyUID", async (req, res, next) => {
    var whiteList = ["c9ca879f-6511-42dd-9481-01e69c40af68"];

    if (!req.session.user) return next();
    if (whiteList.indexOf(req.session.user.uid) == -1) return next();

    var tourney = await tManager.getTourney(req.params.tourneyUID);
    if (!tourney || tourney.error) return next();
    res.render("tourneyManage.njk", { ...tourney, user: req.session.user })
});
app.get("/checkout/:tourneyUID", async (req, res, next) => {
    if (!req.session.user) return res.redirect("/login?goto=/checkout/" + req.params.tourneyUID)
    var tourney = await tManager.getTourney(req.params.tourneyUID);
    if (!tourney || tourney.error) return next();
    if (tourney.players.indexOf(req.session.user.uid) !== -1) return res.redirect("/tourney/" + req.params.tourneyUID);
    res.render("checkout.njk", { ...tourney, user: req.session.user })
});
app.get("/tourneys", async (req, res) => {
    var ongoingTourneys = await tManager.getActiveTourneys();
    var completeTourneys = await tManager.getCompleteTourneys();

    for (var i = 0; i < completeTourneys.length; i++) {
        completeTourneys[i].winnerFormatted = await tManager.getUser(completeTourneys[i].winner);
    }
    res.render("alltourneys.njk", { ongoingTourneys, completeTourneys, user: req.session.user });
})
app.get("/favicon.ico", (req, res) => {
    res.sendFile(resolve("./public/assets/snake.png"))
})
app.get("/tourney/:uid", async (req, res, next) => {
    var tourney = await tManager.getTourney(req.params.uid);
    var currentUserUid = (req.session.user) ? req.session.user.uid || null : null;
    if (!tourney) return next()
    if (tourney.error) return next();
    var games = await tManager.getGamesFromTourney(req.params.uid);
    games = games.sort(sortByTime);

    tourney.players = await Promise.all(tourney.players.map(async player => {
        user = await tManager.getUser(player);
        return { ...user[0], uid: player, elo: user[0].elo || 400 }
    }));
    games = games.map(game => {
        game.currentUserJoined = (game.players.indexOf(currentUserUid) !== -1)
        game.players = game.players.map(playerUID => {
            var player = tourney.players.filter(tourneyMatch => tourneyMatch.uid == playerUID);
            player = player[0] || null;
            var isWinner = (game.winner == player.uid)
            return { ...player, isWinner };
        });
        return game;
    })
    tourney.live_players = tourney.live_players.map(livePlayerUid => {
        var player = tourney.players.filter(tourneyMatch => tourneyMatch.uid == livePlayerUid);
        return player[0] || null
    });
    tourney.ranked_players = tourney.ranked_players || []
    tourney.ranked_players = tourney.ranked_players.map(livePlayerUid => {
        var player = tourney.players.filter(tourneyMatch => tourneyMatch.uid == livePlayerUid);
        return player[0] || null
    })
    var playerHasJoined = false;
    if (req.session.user) {
        var user = await tManager.getUser(req.session.user.uid);
        playerHasJoined = (user[0].tourneys.indexOf(tourney.uid) !== -1);
    }
    res.render("tourney.njk", { ...tourney, games, playerHasJoined, user: req.session.user })
});
app.post("/newTourney", express.json(), async (req, res) => {
    try {
        var { entry_fee, start_at, max_games_per_day, game_hour_diff, friendlyName } = req.body;
        var tres = await tManager.createTourney(entry_fee, start_at, max_games_per_day, game_hour_diff, friendlyName);
        res.status(200).send(tres);
    } catch (err) {
        console.log(err);
        res.status(500).send({ error: true, message: err.message })
    }

});
app.post("/get-join-link", express.json(), async (req, res) => {
    if (!req.session.user) return res.json({ error: true, message: "Not authorized" })
    var game = await tManager.getGame(req.body.game_id);
    if (game.start_at - new Date().getTime() <= 3 * 60 * 1000 && game.players.indexOf(req.session.user.uid) !== -1) {
        res.json({ link: game.link })
    } else {
        res.json({ error: true, message: "not authorized" })
    }

})
app.post("/newRound", express.json(), async (req, res) => {
    var { start_at, uid } = req.body;
    const tourney = await tManager.getTourney(uid);
    if (!tourney || tourney.error) return res.status(500).send({ error: true, message: "Tourney UID malformed or does not exist" })
    if (!start_at) return res.status(500).send({ error: true, message: "No start time provided" });
    var tres = await tManager.createRound({ start_at, tourney });
    console.log(tres)
    if (!tres || tres.error) return res.status(500).send({ error: true, message: (tres) ? tres.message || "Something went wrong..." : "Something went wrong..." })
    return res.status(200).send({ data: tres })
});
app.post("/multisnake_link_hook", express.json(), async (req, res) => {
    console.log(req.body)
    /* data: {
                    snake,
                    roomUID: this.uid,
                    roomType: this.type
                }, */
    var { data, timestamp, type, key, gameUID } = req.body;
    if(!data || !timestamp || !type || !key || !gameUID) return res.status(400).send("Malformed request")
    if(key !== process.env["ROUND_KEY"]) return res.status(401).send("Invalid key");
    switch (type) {
        case "win":
            var { snake, roomUID, roomType } = data;
            if(!snake || !roomUID || !roomType) return res.status(400).send("Malformed request")
            await tManager.putWinner(gameUID, snake.uid);
            break;
    }
    res.status(200).json({ success: true })
})
app.post('/login', express.json(), async (req, res) => {
    const { email, password } = req.body;

    try {
        // Retrieve user data by email
        const userData = await tManager.getUserByEmail(email)
        if (userData.length === 0) {
            return res.status(400).json({ message: 'Invalid email or password', color: "red" });
        }

        const user = userData[0];

        // Verify password (replace with your own password verification logic)
        if (user.passwordHash !== password) {
            return res.status(400).json({ message: 'Invalid email or password', color: "red" });
        }

        // Set session data
        delete user.passwordHash;
        req.session.user = user;

        // Return success response
        res.status(200).json({ message: 'Login successful', color: "green", redirect: req.session.goto || "/account" });
        delete req.session.goto;
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: err.message, color: "red" });
    }
});
app.post("/find_account", express.json(), async (req, res) => {
    try {
        var { email } = req.body
        var user = await dbManager.getDataByEmail(email);

        if (!user) {
            return res.status(400).json({ code: 400, message: "No user found", color: "red" })
        }
        res.status(200).json(user)
    } catch (err) {
        return res.status(500).json({ code: 500, message: err.message, error: err, color: "red" })
    }
});
app.post("/create-payment-intent", express.json(), async (req, res) => {
    const { item } = req.body;
    var tourney = await tManager.getTourney(item.id);
    if (!tourney || tourney.error) return res.status(404).send({ error: "Tourney specified does not exist" });
    if (tourney.ongoing || tourney.complete || (new Date().getTime() > tourney.start_at)) return res.status(403).send({ error: "Tourney started or complete" });
    if (!req.session.user || (req.session.user && !req.session.user.verified)) return res.status(403).send({ error: "Account not verified" })
    async function calculateOrderAmount() {
        var f = (x) => ((x + 30) / (1 - 0.029));
        return [tourney.entry_fee, Math.ceil(f(tourney.entry_fee * 100))];
    }
    // Create a PaymentIntent with the order amount and currency

    var costs = await calculateOrderAmount(item);
    const paymentIntent = await stripe.paymentIntents.create({
        amount: costs[1],
        currency: "usd",
        metadata: {
            tourneyUID: item.id
        },
        // In the latest version of the API, specifying the `automatic_payment_methods` parameter is optional because Stripe enables its functionality by default.
        automatic_payment_methods: {
            enabled: true,
        },
    });

    res.send({
        clientSecret: paymentIntent.client_secret,
        costs
    });
});
app.post('/stripe_webhook', bodyParser.raw({ type: 'application/json' }), async (request, response) => {
    const payload = request.body;
    const sig = request.headers['stripe-signature'];
    let event;
    async function refund(event,tourney,reason){
        await dbManager.sendPaymentFailed(event.data.object.receipt_email, tourney,reason);
        const refund = await stripe.refunds.create({
            payment_intent: event.data.object.id,
        });
    }
    try {
        event = await stripe.webhooks.constructEventAsync(payload, sig, endpointSecret);
    } catch (err) {
        console.log(err)
        return response.status(400).send(`Webhook Error: ${err.message}`);
    }
    if (event.type == "payment_intent.succeeded") {
        var email = "";
        if (event && event.data && event.data.object && event.data.object.receipt_email && event.data.object.metadata && event.data.object.metadata.tourneyUID) {
            var player = await tManager.getUserByEmail(event.data.object.receipt_email);
            var tourney = await tManager.getTourney(event.data.object.metadata.tourneyUID)
            player = player[0]
            if (!player) {
                await refund(event, tourney, `Email ${event.data.object.receipt_email} is not associeted with a user in the database. If you think this is a mistake, email me directly at sojs@multisnake.com`)
                return response.status(200).send(`Email ${event.data.object.receipt_email} not associated with a user in the database, refunding`);
            }
            if (!tourney) {
                await refund(event, tourney,'This tourney does not exist.')
                return response.status(200).send("The tourney does not exist for some odd reason...")
            }
            if (!tourney || tourney.error) {
                await refund(event, tourney, 'Retrieving the tourney returned an error')
                return response.status(200).send({ error: "Tourney specified does not exist" });
            }
            if (tourney.ongoing || tourney.complete || (new Date().getTime() > tourney.start_at)) {
                await refund(event, tourney, 'Tourney has started or is complete')
                return response.status(200).send({ error: "Tourney started or complete" });
            }
            if (!player || !player.verified) {
                await refund(event, tourney, 'Your account is not verified')
                return response.status(200).send({ error: "Account not verified" })
            }
            var tres = await tManager.addPlayer(event.data.object.metadata.tourneyUID, player.uid);
            return response.status(200).send(tres)
        }
    }
    response.status(200).end();
});
app.post("/getUser", express.json(), async (req, res) => {
    var user = await tManager.getUserByEmail(req.body.email);
    user = user[0];
    res.status(200).json({ user })
})
app.post("/connect_account", express.json(), async (req, res) => {
    try {
        var { email } = req.body
        var user = await dbManager.getDataByEmail(email);

        if (!user) {
            return res.status(400).json({ code: 400, message: "No user found", color: "red" })
        }
        await tManager.putUser(user.Items[0]);
        res.status(200).json({ message: "Account linked", color: "green" })
    } catch (err) {
        return res.status(500).json({ code: 500, message: err.message, error: err, color: "red" })
    }
});

app.use((req, res) => {
    res.status(404).render("404.njk");
})
server.listen(3000, () => {
    console.log('Server Live');
});