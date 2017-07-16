'use strict';

const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const url = require('url');
const fs = require('fs');
const path = require('path');
const util = require('util');
const formidable = require('formidable');
const pg = require('pg');
const crypto = require('crypto');
const port = 8080;

const config = require('./config.js');
const mailer = require('./mailer.js');
const crypt = require('./crypt.js');

const verifyInfoPage = 'templates/verifyInfo.html';

const server = express();
const pool = new pg.Pool(config.sql);

server.use(express.static('frontend'));
server.use(express.static('templates/index'));

server.use(cookieParser());
server.use(session(config.session));

server.post('/submit', (request, response) => {
    //Only json forms
    if (request.get('content-type') !== 'application/json')
        return err400('Wrong content-type: application/json only accepted', response);
    let queryData = '';
    let form = new formidable.IncomingForm();
    form.parse(request, (err, fields, files) => {
        if (err)
            return response.status(413).send(err);
        if (!('type' in fields))
            return err400(undefined, response);
        switch (fields.type) {
            case 'send email': processSendEmail(request, response, fields); break;
            case 'sign up': processSignUp(request, response, fields); break;
            case 'sign in': processSignIn(request, response, fields); break;
            default: err400(undefined, response); break;
        }
    });
});

server.get('/password/reset/:hash', processCreateResetPassword);
server.post('/password/reset/:hash', processResetPassword);

pool.query(
    'CREATE TABLE IF NOT EXISTS users('+
    'id INTEGER PRIMARY KEY,'+
    'email VARCHAR(320) UNIQUE NOT NULL,'+
    'nickname VARCHAR(40) NOT NULL,'+
    'passwd VARCHAR(64) NOT NULL,'+
    'level INTEGER DEFAULT 1,'+
    'xp INTEGER DEFAULT 0,'+
    'coin INTEGER DEFAULT 0,'+
    'hash VARCHAR(64) DEFAULT NULL'+
')')
.then(() => {
    server.listen(port, ()=> {
        util.log('Server is listening on ' + port);
    });
})
.catch(err => {
    util.log('Can\'t create/use db users;\n' + err);
});

function processSendEmail(request, response, fields) {
    if (!('email' in fields))
        return err400(undefined, response);
    if (!isValidEmail(fields.email)) {
        util.log('Not valid email: '+ fields.email + ';');
        return err400('email not valid', response);
    }
    pool.connect()
    .then(client => {
        client.query('SELECT * FROM users WHERE email = $1', [fields.email])
        .then(res => {
            if (typeof res === 'undefined' || typeof res.rows[0] === 'undefined') {
                util.log('bad email: '+ fields.email + ';');
                return err400('email not exists', response);
            }
            let userHash = crypto.randomBytes(48, (err,buff) => {
                if (err)
                    util.log('user\'s hash encryption error: ' + err + ';');
                return buff.toString('base64').replace(/\//g, '_').replace(/\+/g, '-');
            });
            if (typeof userHash == 'undefined')
                return err500(undefined, response);
            client.query('UPDATE users SET hash = $1 WHERE email = $2', [userHash, fields.email])
            .then(res => {
                let address = request.protocol + '://' + request.get('host') + '/password/reset/' + userHash;
                let text = 'If you want to reset your password,'+
                        ' then click on the following link,'+
                        ' or by copying and pasting it into your browser: '+
                        address;
                mailer.sendMail(
                    res.rows[0].email,     //user's email
                    'Reset your password', // title
                    text,
                    (err, info) => {
                    if (err) {
                        client.query('UPDATE users SET hash = NULL WHERE email = $2', [userHash, fields.email]);
                        return err500(err, response);
                    }
                    fs.readFile(verifyInfoPage, 'binary', (err, file) => {
                        return response.status(200).send(err ? 'Verification email was sent to your email' : file);
                    });
                });
            });
        });
    })
    .catch(err => {
        err500(err, response);
    });
}
function processSignUp(request, response, fields) {
    if (!(('email' in fields) && ('nickname' in fields) &&
         ('passwd' in fields)))
        return err400(undefined, response);
    if (!isValidEmail(fields.email)) {
        util.log('Not valid email: '+ fields.email + ';');
        return err400('email not valid', response);
    }
    if (!isValidNickname(fields.nickname)) {
        util.log('Not valid nickname of '+ fields.email + ';');
        return err400('nickname not valid', response);
    }
    if (!isValidPasswd(fields.passwd)) {
        util.log('Not valid password of '+ fields.email + ';');
        return err400('password not valid', response);
    }
    pool.connect()
    .then(client => {
        client.query('SELECT email FROM users WHERE email = $1', [fields.email])
        .then(res => {
            if (typeof res !== 'undefined' && typeof res.rows[0] !== 'undefined') {
                util.log('email "'+ fields.email + '" already exists;');
                return err400('email already exists', response);
            }
            let passwdHash = crypt.encrypt(fields.passwd, (err, hash) => {
                if (err) util.log('password\'s encryption error: ' + err + ';');
                return hash;
            });
            if (typeof passwdHash === 'undefined')
                return err500(undefined, response);
            client.query('INSERT INTO users(email, nickname, passwd) VALUES ($1, $2, $3)',
                        [fields.email, fields.nickname, passwdHash])
            .then(res => {
                //TODO: make session & cookie
            });
        });
    })
    .catch(err => {
        err500(err, response);
    });
}
function processSignIn(request, response, fields) {
    if (!(('email' in fields) &&
        ('passwd' in fields)))
        return err400(undefined, response);
    if (!isValidEmail(fields.email)) {
        util.log('Not valid email: '+ fields.email + ';');
        return err400('email not valid', response);
    }
    if (!isValidPasswd(fields.passwd)) {
        util.log('Not valid password of '+ fields.email + ';');
        return err400('password not valid', response);
    }
    pool.connect()
    .then(client => {
        client.query('SELECT * FROM users WHERE email = $1', [fields.email])
        .then(res => {
            if (typeof res === 'undefined' || typeof res.rows === 'undefined') {
                util.log('email "' + fields.email + '" isn\'t exists;');
                return err400('wrong email/password');
            }
            crypt.compare(fields.passwd, res.rows[0].passwd, (err, isMatched) => {
                if (err)
                    return err500(err, response);
                if (!isMatched) {
                    util.log('wrong password from email "' + fields.email + '";');
                    return err400('wrong email/password');
                }
                client.query('UPDATE users SET hash = NULL WHERE email = $1', [fields.email]);
                //TODO: accept user
            });
        });
    })
    .catch(err => {
        err500(err, response);
    })
}

function processResetPassword(request, response) {
    let hash = request.params.hash;
    pool.connect()
    .then(client => {
        client.query('SELECT * FROM users WHERE hash = $1', [hash])
        .then(res => {
            if (typeof res === 'undefined' || typeof res.rows == 'undefined') {
                util.log('Bad hash "' + hash + '" isn\'t exists;');
                return err400('bad hash');
            }
            //TODO: Reseting password
        })
    })
    .catch(err => {
        err500(err, res);
    })
}

function err400(err, res) {
    res.status(400).send(err ? err : (
    '<div class="container">'+
        '<h3>Ooops!</h3>'+
        '<h1>400</h1>'+
        '<h4>Server can\'t understand request</h4>'+
    '</div>'));
}
function err500(err, res) {
    if (err) util.log(err.message, err.stack);
    res.status(500).send(
    '<div class="container">'+
        '<h3>Ooops!</h3>'+
        '<h1>500</h1>'+
        '<h4>Server can\'t resolve request</h4>'+
    '</div>');
}

//Form validation
function isValidEmail(email) {
    let re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
}
function isValidPasswd(elem) {
    let re = /^(?=.*[0-9])(?=.*[A-Z])(?=.*[a-z])[a-zA-Z0-9_]{6,16}$/;
    return re.test(elem);
}
function isValidNickname(elem) {
    let re = /^[^0-9]\w+$/;
    return re.test(elem);
}