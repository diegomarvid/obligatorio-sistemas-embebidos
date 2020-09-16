const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const CryptoJS = require("crypto-js")

let MAX_TEMP = 90;
let MIN_TEMP = 5;

const USER = 'root';
const KEY = 'admin';

let config_encrypt_str = CryptoJS.AES.encrypt(USER,KEY).toString();

//Sacar los + y / para no tener rutas erroneas
config_encrypt_str = config_encrypt_str.replace('+', '');
config_encrypt_str = config_encrypt_str.replace('/', '');

let config_route = '/' + config_encrypt_str;
console.log(config_route)

const app = express();

let serv = require('http').Server(app);

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/client/index.html');
});

app.get(config_route, function(req, res) {
    res.sendFile(__dirname + '/client/config.html');
});

app.use('/client', express.static(__dirname + '/client'));

serv.listen(process.env.PORT || 8080, function() {
    console.log("Server listening at 8080");
});


SOCKET_LIST = {};

let io = require('socket.io')(serv, {});

let db = new sqlite3.Database('./db/temp.db', sqlite3.OPEN_READONLY, (err) => {
    if (err) {
      console.error(err.message);
    }
    console.log('Connected to temp database.');
  });

io.sockets.on('connection', function(socket) {


    socket.id = Math.random();
    SOCKET_LIST[socket.id] = socket;

    console.log(`socket connection from client ${socket.id}`);

    socket.on('logIn', function(data) {
        if(data.username == USER){
            socket.emit('logInResponse', {success: true, config_link: config_encrypt_str, max_temp: MAX_TEMP, min_temp: MIN_TEMP});
        } else{
            socket.emit('logInResponse', {success: false, config_link: ""});
        }
        
    });
    
    socket.on('dateRange', function(data){

        db.all('SELECT * FROM test WHERE date BETWEEN ? AND ?', [data.startDate, data.endDate], function(err, rows){
            socket.emit('tempUpdate', {temp: rows});
        });
    });

    //----------------Sockets de configuracion---------------------//

    socket.on('config-temp-range', function(data){
        MIN_TEMP = data.min_temp;
        MAX_TEMP = data.max_temp;
    });

    socket.on('config-tiempo-muestras', function(data){
        console.log("recibo tiempo muestras");
        console.log(data);
    });

    socket.on('config-email', function(data){
        console.log("recibo email");
        console.log(data);
    });

    socket.on('config-tiempo-alerta', function(data){
        console.log("recibo tiempo entre alertas");
        console.log(data);
    });
    

});

let socket;

setInterval(function() {

    db.all('SELECT * FROM test ORDER BY date DESC LIMIT 1', function(err, rows){
        
        for(let i in SOCKET_LIST){
            socket = SOCKET_LIST[i];
            socket.emit('lastTemp', {temp: rows[0], min_temp: MIN_TEMP, max_temp: MAX_TEMP} );
        }
    
    });
       

}, 1000);

