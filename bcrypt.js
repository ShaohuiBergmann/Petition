const bcrypt = require("bcryptjs");
//use when sign in
exports.hash = (password) => {
    return bcrypt.genSalt().then((salt) => {
        return bcrypt.hash(password, salt);
    });
};
// use when log in
exports.compare = bcrypt.compare;
