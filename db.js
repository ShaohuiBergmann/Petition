const spicedPg = require("spiced-pg");
const database = "petition";
const username = "postgres";

const password = "postgres";

const db = spicedPg(
    process.env.DATABASE_URL ||
        `postgres:${username}:${password}@localhost:5432/${database}`
);

module.exports.insertUserInfo = (sign, userId) => {
    const q = `INSERT INTO signatures (Signature, user_id)
            VALUES ($1, $2)
            RETURNING id`;
    const param = [sign, userId];
    return db.query(q, param);
};

module.exports.getSigners = () => {
    return db.query(` SELECT  users.first, users.last, profiles.age,profiles.city,profiles.url 
FROM users
LEFT OUTER JOIN profiles ON users.id = profiles.user_id
JOIN signatures ON signatures.user_id = users.id;
`);
};

module.exports.getDataUrl = (picId) => {
    const q = `SELECT signature FROM signatures WHERE id = $1`;
    const param = [picId];
    return db.query(q, param);
};

module.exports.getTotalSigners = () => {
    return db.query(`SELECT COUNT(id) FROM signatures`);
};

module.exports.registerUser = (first, last, email, passwd) => {
    const q = `INSERT INTO users (first, last, email, passwd)
            VALUES ($1, $2, $3, $4)
        RETURNING id`;
    const param = [first, last, email, passwd];
    return db.query(q, param);
};

module.exports.findUser = (email) => {
    const q = `SELECT * FROM users 
    WHERE email = $1`;
    const param = [email];
    return db.query(q, param);
};

module.exports.insertProfile = (age, city, url, user_id) => {
    const q = `INSERT INTO profiles (age, city, url, user_id)
            VALUES ($1, $2, $3, $4)`;
    const param = [age, city, url, user_id];
    return db.query(q, param);
};

module.exports.getSignerCities = (city) => {
    return db.query(
        ` SELECT  users.first, users.last, profiles.age,profiles.city,profiles.url 
FROM users
LEFT OUTER JOIN profiles ON users.id = profiles.user_id
JOIN signatures ON signatures.user_id = users.id
WHERE LOWER(city) = LOWER($1);
`,
        [city]
    );
};
