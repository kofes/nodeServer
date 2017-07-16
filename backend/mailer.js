'use strict';

const nodemailer = require('nodemailer');
const util = require('util');
const config = require('./config');
const crypt = require('./crypt')

const transporter = nodemailer.createTransport(config.mail_server);

exports.sendMail = (to, subject, text, callback) => {
    let mailOptions = {
        from: config.mail_server.auth.user,
        to: email,
        subject: title,
        text: content
    };
    return transporter.sendMail(mailOptions, callback);
}
