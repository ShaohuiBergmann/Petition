const express = require("express");
const app = express();
const db = require("./db");
/////////////set up handlebars////////
const { engine } = require("express-handlebars");
app.engine("handlebars", engine());
app.set("view engine", "handlebars");
/////////////////////////////////////////
app.use(express.static("./public"));
app.use(
    express.urlencoded({
        extended: false,
    })
);
app.use(require("cookie-parser")());

app.get("/petition", (req, res) => {
    res.render("petition", {
        layout: "main",
    });
});
app.get("/thanks", (req, res) => {
    res.render("thanks");
});
app.post("/petition", (req, res) => {
    console.log(req.body)
    
    db.insertUserInfo(req.body.first, req.body.last, req.body.sign);

    res.redirect("/thanks");
});

app.get("/signers", (req, res) => {
    db.getSigners().then((results) => {
        console.log('result', results.rows)
        const signers = results.rows
        res.render("signers", {
            signers
        });
    }).catch((err) => console.log('error', err));
    
});

app.listen(8080, () => {
    console.log("got the petition");
});
