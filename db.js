const spicedPg = require("spiced-pg");
const database = "petition";
const username = "postgres";

const password = "postgres";

const db = spicedPg(
    `postgres:${username}:${password}@localhost:5432/${database}`
);

module.exports.insertUserInfo = (first, last, sign) => {
    const q = `INSERT INTO signatures (first, last, Signature)
            VALUES ($1, $2, $3)
            RETURNING id`;
    const param = [first, last, sign];
    return db.query(q, param);
};

module.exports.getSigners = () => {
    return db.query(`SELECT first, last FROM signatures`);
};

module.exports.getDataUrl = (picId) => {
    const q = `SELECT signature FROM signatures WHERE id = $1`;
    const param = [picId];
    return db.query(q, param)
}

module.exports.getTotalSigners =() => {
    return db.query(`SELECT COUNT(id) FROM signatures`)
}