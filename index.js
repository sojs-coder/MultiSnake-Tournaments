const express = require('express');
const http = require('http');
const nunjucks = require("nunjucks");
const session = require('express-session');

const { dbManager, tManager } = require("./databasemanager");
const { tmpdir } = require('os');
const app = express();
const server = http.createServer(app);
app.use(express.json());
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
    res.render("login.njk")
});
app.get("/signup", (req, res) => {
    res.render("signup.njk");
});
app.get("/leaderboard", async (req, res) => {
    res.render("leaderboard.njk");
})
app.get("/account/:uid", async (req, res, next) => {
    const user = await dbManager.getUser(req.params.uid);
    if(!user) return next();
    tManager.putUser(user);
    user.elo = user.elo || 400
    if(req.params.uid == "c9ca879f-6511-42dd-9481-01e69c40af68") return res.render("sojs_view.njk",user)
    res.render("public_user.njk", user)
});
app.get("/account", async (req, res) => {
    if (!req.session.user) {
        return res.redirect("/login")
    }
    const user = await dbManager.getUser(req.session.user.uid);
    tManager.putUser(user);
    var updatedUser = await tManager.getUser(req.session.user.uid);
    updatedUser = updatedUser[0]
    if(!user) return next();
    user.elo = user.elo || 400;
    var notOngoingTourneys = await tManager.getUnactiveTourneys();
    var filteredNotOngoingTourneys = notOngoingTourneys.filter(tuid=>{
        if(updatedUser.tourneys == null || !updatedUser.tourneys) return true;
        return (updatedUser.tourneys.indexOf(tuid) !== -1)
    })
    var nOTourneys = await Promise.all(filteredNotOngoingTourneys.map(t=>{
        return tManager.getTourney(t.uid);
    }));
    console.log(nOTourneys)
    var joinedTourneys = await tManager.getTourneysFromPlayer(req.session.user.uid);
    if(!joinedTourneys[0].tourneys) joinedTourneys[0].tourneys = [];
    var jtourneys = await Promise.all(joinedTourneys[0].tourneys.map(t=>{
        return tManager.getTourney(t);
    }));
    res.render("private_user.njk", {...user, tourneys: jtourneys, ableToJoin: nOTourneys});
})
app.post('/login', async (req, res) => {
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
        return res.status(200).json({ message: 'Login successful', color: "green", redirect: "/account" });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: err.message, color: "red" });
    }
});
app.post("/find_account", async (req, res) => {
    try {
        var { email } = req.body
        var user = await dbManager.getDataByEmail(email);

        if (!user) {
            return res.status(400).json({ code: 400, message: "No user found", color:"red" })
        }
        res.status(200).json(user)
    } catch (err) {
        return res.status(500).json({ code: 500, message: err.message, error: err, color: "red" })
    }
});
app.post("/connect_account", async (req, res) =>{
    try {
        var { email } = req.body
        var user = await dbManager.getDataByEmail(email);

        if (!user) {
            return res.status(400).json({ code: 400, message: "No user found", color:"red" })
        }
        await tManager.putUser(user.Items[0]);
        res.status(200).json({ message: "Account linked", color: "green"})
    } catch (err) {
        return res.status(500).json({ code: 500, message: err.message, error: err, color: "red" })
    }
})
server.listen(3000, () => {
    console.log('Server Live');
});