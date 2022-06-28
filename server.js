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

if (process.env.NODE_ENV == "production") {
    app.use((req, res, next) => {
        if (req.headers["x-forwarded-proto"].startsWith("https")) {
            return next();
        }
        res.redirect(`https://${req.hostname}${req.url}`);
    });
}

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

app.use((req, res, next) => {
    if (!req.session.userID && req.url != "/login" && req.url != "/register") {
        res.redirect("/register");
    } else {
        next();
    }
});

app.get("/petition", (req, res) => {
    if (req.session.userID) {
        if (req.session.signed != true) {
            res.render("petition", {});
        } else {
            res.redirect("/thanks");
        }
    } else {
        res.redirect("/register");
    }
});

app.post("/petition", (req, res) => {
    if (req.session.userID) {
        db.insertUserInfo(req.body.sign, req.session.userID)
            .then((results) => {
                console.log(results);
                req.session.signatureId = results.rows[0].id;
                req.session.signed = true;
                res.redirect("/thanks");
            })
            .catch((err) => {
                res.send("<h1>OOOOps, something is wrong</h1>");
            });
    } else {
        res.sendStatus(403);
    }
});

app.get("/thanks", (req, res) => {
    if (req.session.signed == true) {
        let imgUrl;
        db.getDataUrl(req.session.signatureId)
            .then((results) => {
                console.log("results at thanks ", results.rows);
                imgUrl = results.rows[0].signature;
                db.getTotalSigners()
                    .then((results) => {
                        console.log(results.rows);
                        req.session.totalSigners = results.rows[0].count;
                        res.render("thanks", {
                            signedData: {
                                url: imgUrl,
                                totalSig: req.session.totalSigners,
                            },
                        });
                    })
                    .catch((err) => {
                        console.log("error", err);
                    });
            })
            .catch((err) => {
                console.log("thanks err", err);
                res.send("<h1>picture is missing</h1>");
            });
    } else {
        res.redirect("/petition");
    }
});

app.post("/thanks", (req, res) => {
    if (req.session.userID) {
        db.deleteSig(req.session.signatureId)
            .then(() => {
                req.session.signatureId = null;
                req.session.signed = null;
                res.redirect("/petition");
            })
            .catch((err) => {
                console.log("error in deleteSig", err);
            });
    } else {
        res.sendStatus(403);
    }
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
    const city = req.params.city;
    db.getSignerCities(city)
        .then((results) => {
            console.log("results for cities", results.rows);
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
            console.log("results at login", results.rows);
            bcrypt
                .compare(req.body.pwd, results.rows[0].passwd)
                .then((match) => {
                    if (!match) {
                        res.send("<h1>Error</h1>");
                    } else {
                        req.session.userID = results.rows[0].id;

                        db.findUserSignatures(req.session.userID).then(
                            (results) => {
                                console.log(
                                    "results at find sig",
                                    results.rows
                                );
                                if (results.rows[0]) {
                                    req.session.signatureId =
                                        results.rows[0].id;
                                    req.session.signed = true;
                                    res.redirect("/thanks");
                                } else {
                                    res.redirect("/petition");
                                }
                            }
                        );
                    } // outer if
                }); //then
        })
        .catch((err) => {
            console.log("err in login", err);
            res.render("login", {
                error: true,
            });
        });
});

app.get("/profile", (req, res) => {
    res.render("profile");
});

app.post("/profile", (req, res) => {
    if (req.session.userID) {
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
            db.insertProfile(
                req.body.age,
                req.body.city,
                url,
                req.session.userID
            )
                .then((results) => {
                    res.redirect("/petition");
                })
                .catch((err) => {
                    console.log("error", err);
                });
        }
    } else {
        res.sendStatus(403);
    }
});

app.get("/edit", (req, res) => {
    db.getProfileInfo(req.session.userID)
        .then((results) => {
            console.log(results.rows);
            res.render("edit", {
                results: results.rows,
            });
        })
        .catch((error) => console.log("edit profile error", error));
});

app.post("/edit", (req, res) => {
    if (req.session.userID) {
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
                            console.log(
                                "error while updating users with pwd",
                                err
                            );
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
                    console.log(
                        "error while updating profile without pwd ",
                        err
                    );
                });
        }
    } else {
        res.sendStatus(403);
    }
});

app.listen(process.env.PORT || 8080, () => {
    console.log("got the petition");
});
//
