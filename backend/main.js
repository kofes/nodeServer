'use strict';

const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
const util = require('util');
const formidable = require('formidable');
const port = 8080;

const config = require('./config.js');
const mailer = require('./mailer.js');
const pg = require('pg');

const setOfExt = new Set([
    '.html', '.js', '.css',
    '.jpg', '.png', '.mp4',
    '.mp3', '.gif', ''
    ]);
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
            }
            response.writeHead(200, {'content-type': 'text/plain'});
            response.write('received the data:\n\n');
            if (fields['type'] === 'send_email')
                mailer.sendMail(fields['email'], '', 'Reset password', (err, info) => {
                    if (err) return util.log('Mailer error:\n' + err);
                    util.log('Email sent to' + fields['email'] + ':\n' + info.response);
                });
            response.end(util.inspect({
                fields: fields,
                files: files
            }));
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

server.listen(port);
util.log('Server running at localhost:' + port);