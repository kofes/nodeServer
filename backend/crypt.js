const bcrypt = require('bcrypt');

exports.encrypt = (src, callback) => {
    bcrypt.genSalt(10, (err, salt) => {
        if (err)
            return callback(err, undefined);
        bcrypt.hash(src, salt, (err, hash) => {
            return callback(err, hash);
        });
    });
};

exports.compare = (src, hash, callback) => {
    bcrypt.compare(src, hash, (err, isMatched) => {
        return callback(err, isMatched);
    });
};