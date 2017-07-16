'use strict';

const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
const util = require('util');
const formidable = require('formidable');
const pg = require('pg');
const port = 8080;

const config = require('./config.js');
const mailer = require('./mailer.js');
const crypt = require('./crypt.js');

const setOfExt = new Set([
    '.html', '.js', '.css',
    '.jpg', '.png', '.mp4',
    '.mp3', '.gif', ''
    ]);
const verifyInfoPage = 'verifyInfo.html';

const server = http.createServer(/*config.ssl*/);
const pool = new pg.Pool(config.sql);

server.on('request', (request, response) => {
    util.log('request from "'+ request.connection.remoteAddress + '", method: '+ request.method + ';');
    if (request.method === 'GET')
        processGet(request, response, (err, file) => {
            switch (err) {
                case 404: err404(response); return;
                case undefined: case null: break;
                default: err500(err, response); return;
            }
            response.writeHead(200);
            response.write(file, 'binary');
            response.end();
        });
    else if (request.method == 'POST')
        processPost(request, response, (err, fields, files) => {
            if (err) {
                response.writeHead(413, {'content-type':'text/plain'});
                response.write('Error: ' + err);
                response.end();
                return;
            } else if (!('type' in fields)) {err400(undefined, response); return;}
            switch (fields.type) {
                case 'send email': sendEmail(request, response, fields); break;
                case 'sign up': signUp(request, response, fields); break;
                case 'sign in': signIn(request, response, fields); break;
                default: err400(undefined, response); break;
            }
        });
});

pool.query('CREATE TABLE IF NOT EXISTS users('+
    'id INTEGER PRIMARY KEY,'+
    'email VARCHAR(320) UNIQUE NOT NULL,'+
    'nickname VARCHAR(40) NOT NULL,'+
    'passwd VARCHAR(64) NOT NULL,'+
    'level INTEGER DEFAULT 1,'+
    'xp INTEGER DEFAULT 0,'+
    'coin INTEGER DEFAULT 0'+
')')
.then(() => {
    server.listen(port, ()=> {
        util.log('Server is listening on ' + port);
    });
});

function processGet(request, response, callback) {
    //Parsing uri for path
    let uri = url.parse(request.url).pathname;
    //Hiding backend files
    if (uri.indexOf('/backend/') === 0) {
        callback(404);
        response.end();
        return;
    }
    //Set filename from root directory
    let filename = path.join(process.cwd(), uri);
    fs.exists(filename, (exists) => {
        //Check for existing of file
        if (!exists || !setOfExt.has(path.extname(filename))) {
            callback(404);
            response.end();
            return;
        }
        //If filename is name of directory, then redirect to index.html of this dirctory
        if (fs.statSync(filename).isDirectory()) filename += '/index.html';
        fs.readFile(filename, 'binary', (err, file) => {
            //Check for reading of file
            if (err) {
                callback(err);
                response.end();
                return;
            }
            //Send file's content to user
            callback(undefined, file);
            response.end();
        });
    });
};
function processPost(request, response, callback) {
    let queryData = '';
    let form = new formidable.IncomingForm();

    if (typeof callback !== 'function') return;

    form.parse(request, (err, fields, files) => {
        callback(err, fields, files);
    });
}
function sendEmail (request, response, fields) {
    if (!('email' in fields))
        return err400(undefined, response);
    pool.connect()
    .then(client => {
        client.query('SELECT email FROM users WHERE email = $1', [fields.email])
        .then(res => {
            if (typeof res === 'undefined' || typeof res.row === 'undefined') {
                util.log('bad email: ' + fields.email + ';');
                err400('send email', response);
                return;
            }
            mailer.sendMail(fields.email, '', 'Reset password', (err, info) => {
                if (err) {
                    util.log('Mailer error:\n' + err);
                    return;
                }
                util.log('Email sent to ' + fields.email + ':\n' + info.response);
            });
            fs.readFile(verifyInfoPage, 'binary', (err, file) => {
                if (err) {
                    response.writeHead(200, {'content-type':'text/plain'});
                    response.write('Verification email was sent to your email');
                } else {
                    response.writeHead(200, {'content-type':'text/html'});
                    response.write(file, 'binary');
                }
                response.end();
            });
        })
        .catch(err => {
            util.log('bad email: ' + fields.email + ';\n' + err + ';');
            err400(undefined, response);
        })
    })
    .catch(err => {
        util.log('bad connection;\n' + err + ';');
        err400(undefined, response);
    })
}
function signUp(request, response, fields) {
    if (!(('email' in fields) && ('nickname' in fields) &&
         ('passwd' in fields) && ('repeated_passwd' in fields)))
        return err400(undefined, response);
    pool.connect()
    .then(client => {
        client.query('SELECT email FROM users WHERE email = $1', [fields.email])
            .then(res => {
                if (typeof res !== 'undefined') {
                    util.log('email "' + fields.email + '" already exists;');
                    err400('sign up', response);
                    return;
                }
                let hash = crypt.encrypt(fields.passwd, (err, hash) => {
                    if (err) util.log('Passwd\'s encryption error: ' + err + ';');
                    return hash;
                });
                if (typeof hash == 'undefined') return err500();
                client.query('INSERT INTO users(email, nickname, passwd) VALUES($1, $2, $3)',
                            [fields.email, fields.nickname, hash], (err) => {
                    if (err) return err500(err, response);
                });
            })
            .catch(err => {
                util.log('bad email: ' + fields.email + ';\n' + err + ';');
                err400(err, response);
            });
    })
    .catch(err => {
        err500(err, response);
    });
}
function signIn(request, response, fields) {
    if (!(('email' in fields) &&
        ('passwd' in fields)))
        return err400(undefined, response);
    pool.connect()
    .then(client => {
        client.query('SELECT * FROM users WHERE email = $1', [fields.email])
        .then(res => {
            if (typeof res === 'undefined') {
                util.log('email "' + fields.email + '" isn\'t exists;');
                err400('sign in', response);
                return;
            }
            crypt.compare(fields.passwd, res.rows[0].passwd, (err, isMatched) => {
                if (err) {
                    err500(err, response);
                    return;
                }
                if (!isMatched) {
                    err400('sign in', response);
                    return;
                }
                //Accept user
            });
        })
        .catch(err => {
            util.log('bad email: ' + fields.email + ';\n' + err + ';');
            err400(err, response);
        });
    })
    .catch(err => {
        err500(err, response);
    });
}
function err400(err, res) {
    res.writeHead(400, {'content-type': 'text/html'});
    if (err) res.write(err); else
    res.write(
    '<div class="container">'+
        '<h3>Ooops!</h3>'+
        '<h1>400</h1>'+
        '<h4>Server can\'t understand request</h4>'+
    '</div>');
    res.end();
}
function err500(err, res) {
    if (err) util.log(err.message, err.stack);
    res.writeHead(500, {'content-type': 'text/html'});
    res.write(
    '<div class="container">'+
        '<h3>Ooops!</h3>'+
        '<h1>500</h1>'+
        '<h4>Server can\'t resolve request</h4>'+
    '</div>');
    res.end();
}
function err404(res) {
    res.writeHead(404, {'content-type': 'text/html'});
    res.write(
    '<div class="container">'+
        '<h3>Ooops!</h3>'+
        '<h1>404</h1>'+
        '<h4>Not found</h4>'+
    '</div>');
    res.end();
}