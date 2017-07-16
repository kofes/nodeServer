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
const typeToProcess = {
    'send email': sendEmail,
    'sign up': signUp
};
const verifyInfoPage = 'verifyInfo.html';

const server = http.createServer(/*config.ssl*/);
const pool = new pg.Pool(config.sql);

server.on('request', (request, response) => {
    util.log('request from "'+ request.connection.remoteAddress + '", method: '+ request.method + ';');
    if (request.method === 'GET')
        processGet(request, response, (err, file) => {
            if (err === 404) {
                response.writeHead(404, {'Content-type':'text/plain'});
                response.write('404 NotFound\n');
            } else if (err) {
                response.writeHead(500, {'Content-Type': 'text/plain'});
                response.write(err+'\n');
            } else {
                response.writeHead(200);
                response.write(file, 'binary');
            }
            response.end();
        });
    else if (request.method == 'POST')
        processPost(request, response, (err, fields, files) => {
            if (err) {
                response.writeHead(413, {'content-type':'text/plain'});
                response.write('Error: ' + err);
                response.end();
                return;
            } else if (!('type' in fields && fields.type in typeToProcess))
                return err400();
            typeToProcess[fields.type](request, response, fields);
        });
});

pool.query('CREATE TABLE IF NOT EXISTS users('+
    'id INTEGER PRIMARY KEY,'+
    'email VARCHAR(320) UNIQUE NOT NULL,'+
    'nickname VARCHAR(40) UNIQUE NOT NULL,'+
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
        response.end();
    });
}
function sendEmail (request, response, fields) {
    if (!('email' in fields))
        return err400();
    let query = {
        text: 'SELECT email FROM users WHERE email = $1',
        values: [fields.email]
    };
    pool.query(query, (err, res) => {
        if (err) {
            util.log('bad email: ' + fields.email + ';\n' + err + ';');
            err400();
            return;
        }
        if (typeof res === 'undefined' || typeof res.row === 'undefined') {
            util.log('bad email: ' + fields.email + ';');
            response.writeHead(400, {'content-type':'text/plain'});
            util.log(response.write());
            response.end('email');
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
    });
}
function signUp(request, response, fields) {
    if (!(('email' in fields) && ('nickname' in fields) &&
         ('passwd' in fields) && ('repeated_passwd' in fields)))
        return err400();
    let query = {
        text: 'SELECT email FROM users WHERE email = $1',
        values: [fields.email]
    };
    pool.query(query)
    .then(res => {
        if (typeof res !== 'undefined' || typeof res.row !== 'undefined') {
            util.log('email "' + fields.email + '" already exists;');
            return;
        }
        let hash = crypt.encrypt(fields.passwd, (err, hash) => {
            if (err) util.log('Passwd\'s encryption error: ' + err + ';');
            return hash;
        });
        if (typeof hash == 'undefined') return;
        pool.query('INSERT INTO users(email, nickname, passwd) VALUES($1, $2, $3)',
                   [fields.email, fields.nickname, hash], (err, result) => {
            if (err) return err500(err);
        });
    })
    .catch(err => {
        util.log('bad email for sign up: ' + fields.email + ';\n' + err + ';');
    });
}
function err400() {
    response.writeHead(400, {'content-type': 'text/plain'});    
    response.write('The request could not be understood by the server due to malformed syntax.'+
                   'The client SHOULD NOT repeat the request without modifications.');
    response.end();
}
function err500(err) {
    util.log(err.message, err.stack);
    res.writeHead(500, {'content-type': 'text/plain'});
    res.end('An error occurred');
}