const express = require("express");
const app = express();
const db = require("./db");
const cookieSession = require("cookie-session");
const bcrypt = require("./bcrypt");

/////////////set up handlebars////////
const { engine } = require("express-handlebars");
const { createTestScheduler } = require("jest");
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

const COOKIE_SECRET =
    process.env.COOKIE_SECRET || require("./secrets.json").COOKIE_SECRET;
app.use(
    cookieSession({
        secret: COOKIE_SECRET,
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
            console.log(results);
            req.session.signatureID = results.rows[0].id;
            req.session.signed = true;
            res.redirect("/thanks");
        })
        .catch((err) => {
            console.log("posterr", err);
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

//-----------------------
app.get("/signers/:city", (req, res) => {
    const { city } = req.params;
    db.getSignerCities(city)
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
                res.redirect("/profile");
            });
        })
        .catch((err) => {
            console.log("err", err);
            res.render("register", {
                error: true,
            });
        });
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

                        db.findUserSignatures(req.session.userID).then(
                            (results) => {
                                if (results.row[0]) {
                                    req.session.signatureId =
                                        results.rows[0].id;
                                    res.redirect("/thanks");
                                } else {
                                    res.redirect("/petition");
                                }
                            }
                        );
                    } // outer if
                }); //then
        })
        .catch((err) => console.log("err", err));
});

app.get("/profile", (req, res) => {
    res.render("profile");
});

app.post("/profile", (req, res) => {
    console.log(req.body);
    if (req.body.age == "" && req.body.city == "" && req.body.url == "") {
        res.redirect("/petition");
    } else {
        let url = req.body.url;
        if (
            !url.startsWith("https://") ||
            !url.startsWith("http://") ||
            !url.startsWith("//")
        ) {
            url = "";
        }
        db.insertProfile(req.body.age, req.body.city, url, req.session.userID)
            .then((results) => {
                res.redirect("/petition");
            })
            .catch((err) => {
                console.log("error", err);
            });
    }
});

app.get("/edit", (req, res) => {
    db.getProfileInfo(req.session.userID)
        .then((results) => {
            res.render("edit", {
                results: results.rows,
            });
        })
        .catch(error, console.log("edit profile error", error));
});

app.post("edit", (req, res) => {
    if (req.body.pwd != "") {
        bcrypt
            .hash(req.body.pwd)
            .then((hash) => {
                db.updateUsersWithPwd(
                    req.body.first,
                    req.body.last,
                    req.body.email,
                    hash,
                    req.session.userID
                )
                    .then(() => {
                        db.updateProfiles(
                            req.body.age,
                            req.body.city,
                            req.body.url,
                            req.session.userID
                        )
                            .then(() => {
                                res.redirect("/thanks");
                            })
                            .catch((err) => {
                                console.log(
                                    "error while updating profile ",
                                    err
                                );
                            });
                    })
                    .catch((err) => {
                        console.log("error while updating users with pwd", err);
                    });
            })
            .catch((err) => {
                console.log("error in hash", err);
            });
    } else {
        db.updateUsersWithoutPwd(
            req.body.first,
            req.body.last,
            req.body.email,
            req.session.userID
        )
            .then(() => {
                db.updateProfiles(
                    req.body.age,
                    req.body.city,
                    req.body.url,
                    req.session.userID
                )
                    .then(() => {
                        res.redirect("/thanks");
                    })
                    .catch((err) => {
                        console.log("error while updating profile ", err);
                    });
            })
            .catch((err) => {
                console.log("error while updating profile without pwd ", err);
            });
    }
});

app.listen(process.env.PORT || 8080, () => {
    console.log("got the petition");
});
