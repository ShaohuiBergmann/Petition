const spicedPg = require("spiced-pg");
const database = "petition";
const username = "postgres";

const password = "postgres";

const db = spicedPg(
    `postgres:${username}:${password}@localhost:5432/${database}`
);

module.exports.insertUserInfo = (first, last, sign) => {
    const q = `INSERT INTO signatures (first, last, Signature)
            VALUES ($1, $2, $3)`;
    const param = [first, last, sign];
    return db.query(q, param);
};

module.exports.getSigners = () => {
    return db.query(`SELECT first, last FROM signatures`);
};
