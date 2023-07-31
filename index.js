const express = require('express');
const http = require('http');
const nunjucks = require("nunjucks");
const session = require('express-session');

const { dbManager } = require("./databasemanager");
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
app.get("/user/:uid",async (req,res)=>{
    const user = await dbManager.getUser(req.params.uid)
    res.render("user.njk",{
        ...user
    })
})

server.listen(3000, () => {
    console.log('Server Live');
});