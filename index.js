const express = require('express');
const http = require('http');
const nunjucks = require("nunjucks");
const session = require('express-session');

const { dbManager, tManager } = require("./databasemanager");
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
app.get("/",async (req,res)=>{
    const ongoingTourneys = await tManager.getActiveTourneys();
    if(ongoingTourneys.length >= 1){
        const games = await tManager.getGamesFromTourney(ongoingTourneys[0].uid);
        for (var i = 0; i < games.length; i++){
            var game = games[i];
            game.players = await Promise.all(game.players.map(player=>{
                return dbManager.getUser(player)
            }))
        }
        res.render("activeTourneyHome.njk",{
            t: ongoingTourneys[0],
            g: games
        });
    }
})
app.get("/user/:uid", async (req, res) => {
    const user = await dbManager.getUser(req.params.uid)
    res.render("user.njk", {
        ...user
    })
})

server.listen(3000, () => {
    console.log('Server Live');
});