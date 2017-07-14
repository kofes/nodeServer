'use strict';

const nodemailer = require('nodemailer');
const util = require('util');
const config = require('./config.js');

const transporter = nodemailer.createTransport(config.mail_server);

exports.sendMail = (email, content, title, callback) => {
    let mailOptions = {
        from: config.mail_server.auth.user,
        to: email,
        subject: title,
        text: content
    };
    transporter.sendMail(mailOptions, callback);
}