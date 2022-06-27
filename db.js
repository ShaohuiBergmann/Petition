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
    WHERE email = $1;`;
    const param = [email];
    return db.query(q, param);
};

module.exports.findUserSignatures = (userId) => {
    const q = `SELECT * FROM signatures 
    WHERE user_id = $1;`;
    const param = [userId];
    return db.query(q, param);
};

module.exports.insertProfile = (age, city, url, user_id) => {
    const q = `INSERT INTO profiles (age, city, url, user_id)
            VALUES ($1, $2, $3, $4)`;
    const param = [age, city, url, user_id];
    return db.query(q, param);
};

module.exports.getSignerCities = (city) => {
    const q = `SELECT  users.first, users.last, profiles.age,profiles.city,profiles.url 
FROM users
LEFT OUTER JOIN profiles ON users.id = profiles.user_id
JOIN signatures ON signatures.user_id = users.id
WHERE LOWER(city) = LOWER($1);`;
    const param = [city];
    return db.query(q, param);
};

module.exports.getProfileInfo = (userId) => {
    const q = ` SELECT users.first, users.last, users.email, profiles.age, profiles.city, profiles.url 
                FROM users
                LEFT OUTER JOIN profiles ON users.id = profiles.user_id
                WHERE users.id = $1;`;
    const param = [userId];
    return db.query(q, param);
};

module.exports.updateUsersWithPwd = (first, last, email, password, id) => {
    const q = `UPDATE users
    SET first = $1, last = $2, email =  $3, passwd = $4 
    WHERE  id = $5`;
    const param = [first, last, email, password, id];
    return db.query(q, param);
};

module.exports.updateProfiles = (age, city, url, userId) => {
    const q = `INSERT INTO profiles(age, city, url, user_id) 
VALUES($1, $2, $3, $4)
ON CONFLICT (user_id)
DO UPDATE SET age = $1, city = $2, url =  $3, user_id = $4 ;`;
    const param = [age, city, url, userId];
    return db.query(q, param);
};

module.exports.updateUsersWithoutPwd = (first, last, email, id) => {
    const q = `UPDATE users
    SET first = $1, last = $2, email =  $3
    WHERE  id = $4`;
    const param = [first, last, email, id];
    return db.query(q, param);
};

module.exports.deleteSig = (signature) => {
    return db.query(
        `DELETE FROM signatures
     WHERE signature = $1 ;`,
        [signature]
    );
};
