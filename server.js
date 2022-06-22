const express = require("express");
const app = express();
const db = require("./db");
const cookieSession = require("cookie-session");
const bcrypt = require("./bcrypt");

/////////////set up handlebars////////
const { engine } = require("express-handlebars");
app.engine("handlebars", engine());
app.set("view engine", "handlebars");
/////////////////////////////////////////
app.use((req, res, next) => {
    res.setHeader("x-frame-options", "deny");
    next();
});

app.use(express.static("./public"));
app.use(
    express.urlencoded({
        extended: false,
    })
);
app.use(
    cookieSession({
        secret: `I'm always angry.`,
        maxAge: 1000 * 60 * 60 * 24 * 14,
        sameSite: true,
    })
);

app.use((req, res, next) => {
    console.log("---------------------");
    console.log("req.url:", req.url);
    console.log("req.method:", req.method);
    console.log("req.session:", req.session);
    console.log("---------------------");
    next();
});

app.get("/petition", (req, res) => {
    if (req.session.signed != true) {
        res.render("petition", {});
    } else {
        res.redirect("/thanks");
    }
});

app.post("/petition", (req, res) => {
    db.insertUserInfo(req.body.sign, req.session.userID)
        .then((results) => {
            req.session.signatureID = results.rows[0].id;
            req.session.signed = true;
            res.redirect("/thanks");
        })
        .catch((err) => {
            res.send("<h1>OOOOps, something is wrong</h1>");
        });
});

app.get("/thanks", (req, res) => {
    let imgUrl;
    db.getDataUrl(req.session.signatureID)
        .then((results) => {
            imgUrl = results.rows[0].signature;
        })
        .catch((err) => {
            res.send("<h1>picture is missing</h1>");
        });

    db.getTotalSigners()
        .then((results) => {
            console.log(results.rows);
            req.session.totalSigners = results.rows[0].count;
            if (req.session.signed) {
                res.render("thanks", {
                    signedData: {
                        url: imgUrl,
                        totalSig: req.session.totalSigners,
                    },
                });
            } else {
                res.redirect("/petition");
            }
        })
        .catch((err) => {
            console.log("error", err);
        });
});

app.get("/signers", (req, res) => {
    db.getSigners()
        .then((results) => {
            const signers = results.rows;
            res.render("signers", {
                signers,
            });
        })
        .catch((err) => console.log("error", err));
});
app.get("/logout", (req, res) => {
    req.session = null;
    res.redirect("/register");
});

app.get("/register", (req, res) => {
    res.render("register");
});

app.post("/register", (req, res) => {
    bcrypt
        .hash(req.body.pwd)
        .then((hash) => {
            console.log("hashpwd", hash);
            db.registerUser(
                req.body.first,
                req.body.last,
                req.body.email,
                hash
            ).then((results) => {
                console.log("results", results.rows);
                req.session.userID = results.rows[0].id;
            });
        })
        .catch((err) => console.log("err", err));
});

app.get("/login", (req, res) => {
    res.render("login");
});
app.post("/login", (req, res) => {
    db.findUser(req.body.email)
        .then((results) => {
            bcrypt
                .compare(req.body.pwd, results.rows[0].passwd)
                .then((match) => {
                    if (!match) {
                        res.send("<h1>Error</h1>");
                    } else {
                        req.session.userID = results.rows[0].id;
                    }
                });
        })
        .catch((err) => console.log("err", err));
});

app.listen(8080, () => {
    console.log("got the petition");
});
