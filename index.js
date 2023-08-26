const express = require('express');
const http = require('http');
const nunjucks = require("nunjucks");
const session = require('express-session');
const { sortByTime } = require("./helpers.js")
const { dbManager, tManager } = require("./databasemanager");
const app = express();
const server = http.createServer(app);
const stripe = require("stripe")(process.env.STRIPE_SECRET)
const bodyParser = require('body-parser');
const endpointSecret = process.env.SIGN_SECRET;


app.use(express.static(
    "./public"
));
nunjucks.configure("views", {
    autoescape: true,
    express: app
});
app.use(
    session({
        secret: process.env.KEY,
        resave: false,
        saveUninitialized: true
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
            g: games
        });
    } else {
        const nextTourney = await tManager.getUnactiveTourneys();
        res.render("noactiveTourneyHome.njk", {
            t: nextTourney[0],
        });
    }
});
app.get("/login", (req, res) => {
    req.session.goto = req.query.goto
    res.render("login.njk")
});
app.get("/signup", (req, res) => {
    res.render("signup.njk");
});
app.get("/leaderboard", async (req, res) => {
    var ranks = await tManager.getRanks();
    ranks = ranks.map(player => {
        player.elo = player.elo || "400*"
        return player
    })

    res.render("leaderboard.njk", { ranks });
})
app.get("/account/:uid", async (req, res, next) => {
    const user = await dbManager.getUser(req.params.uid);
    if (!user) return next();
    tManager.putUser(user);
    user.elo = user.elo || 400
    if (req.params.uid == "c9ca879f-6511-42dd-9481-01e69c40af68") return res.render("sojs_view.njk", user)
    res.render("public_user.njk", user)
});
app.get("/account", async (req, res) => {
    if (!req.session.user) {
        return res.redirect("/login")
    }
    const user = await dbManager.getUser(req.session.user.uid);
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
    res.render("private_user.njk", { ...user, tourneys: jtourneys, ableToJoin: nOTourneys });
});
app.get("/join/:tourneyUID",(req,res)=>{
    res.redirect("/checkout/"+req.params.tourneyUID)
})
app.get("/checkout/:tourneyUID", async (req, res, next) => {
    if (!req.session.user) return res.redirect("/login?goto=/checkout/"+req.params.tourneyUID)
    var tourney = await tManager.getTourney(req.params.tourneyUID);
    if (!tourney || tourney.error) return next();

    res.render("checkout.njk", tourney)
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
        return { ...user[0], uid: player }
    }));
    games = games.map(game => {
        game.currentUserJoined = (game.players.indexOf(currentUserUid) !== -1)
        game.players = game.players.map(playerUID => {
            var player = tourney.players.filter(tourneyMatch => tourneyMatch.uid == playerUID);
            player = player[0] || null;

            return player;
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
    if(req.session.user) {
        var user = await tManager.getUser(req.session.user.uid);
        playerHasJoined = (user.tourneys.indexOf(tourney.uid) !== -1)
    }
    res.render("tourney.njk", { ...tourney, games, playerHasJoined })
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
        res.status(200).json({ message: 'Login successful', color: "green", redirect: req.session.goto || "/account"});
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
    if (!tourney || tourney.error) return res.status(404).send({ error: "Tourney specified does not exist " });
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

    try {
        event = stripe.webhooks.constructEvent(payload, sig, endpointSecret);
    } catch (err) {
        console.log(err)
        return response.status(400).send(`Webhook Error: ${err.message}`);
    }
    if (event.type == "payment_intent.succeeded") {
        var email = "";
        if (event && event.data && event.data.object && event.data.object.receipt_email && event.data.object.metadata && event.data.object.metadata.tourneyUID) {
            console.log("EMAIL", event.data.object.receipt_email);
            console.log("TOURNEY", event.data.object.metadata.tourneyUID);
            var player = await tManager.getUserByEmail(event.data.object.receipt_email);
            var tourney = await tManager.getTourney(event.data.object.metadata.tourneyUID)
            player = player[0]
            if (!player) {
                await dbManager.sendPaymentFailed(event.data.object.receipt_email, tourney);
                const refund = await stripe.refunds.create({
                    payment_intent: event.data.object.id,
                });
                return response.status(400).send(`Email ${event.data.object.receipt_email} not associated with a user in the database, refunding`);
            }
            if (!tourney) {
                return response.status(400).send("The tourney does not exist for some odd reason...")
            }

            tManager.addPlayer(event.data.object.metadata.tourneyUID,player.uid);
        }
    }
    response.status(200).end();
});
app.post("/getUser",express.json(), async (req,res)=>{
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
})
server.listen(3000, () => {
    console.log('Server Live');
});