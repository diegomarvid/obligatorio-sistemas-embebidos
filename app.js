const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const CryptoJS = require("crypto-js");
const { rootCertificates } = require('tls');

let MAX_TEMP = 90;
let MIN_TEMP = 5;

const USER = 'root';
const KEY = 'admin';

const CONFIG = {
    TEMP_MIN: 1,
    TEMP_MAX: 2,
    TIEMPO_MUESTREO: 3,
    EMAIL: 4,
    TIEMPO_ALARMAS: 5
};

let tiempo_muestreo = 5;
let tiempo_alerta = 5;
let email = 'diegomarvid99@gmail.com';

let config_encrypt_str = CryptoJS.AES.encrypt(USER,KEY).toString();

//Sacar los + y / para no tener rutas erroneas
config_encrypt_str = config_encrypt_str.split('+').join('');

let config_route = '/' + config_encrypt_str;

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

let db = new sqlite3.Database('./db/temp.db', (err) => {
    if (err) {
      console.error(err.message);
    }
    console.log('Connected to temp database.');
  });

io.sockets.on('connection', function(socket) {


    socket.id = Math.random();
    SOCKET_LIST[socket.id] = socket;

    socket.on('logIn', function(data) {
        if(data.username == USER && data.password == KEY){
            socket.emit('logInResponse', {success: true, config_link: config_encrypt_str, max_temp: MAX_TEMP, min_temp: MIN_TEMP});
        } else{
            socket.emit('logInResponse', {success: false, config_link: ""});
        }
        
    });

    db.all('SELECT * from config', function(err, rows){
        if(err){
            console.log(err);
        }else{ 
            socket.emit('config-update', {rows: rows});
        }
    })
    
    socket.once('disconnect', function () {
        delete SOCKET_LIST[socket.id];
      });


    socket.on('dateRange', function(data){



        db.all('SELECT * FROM test WHERE date BETWEEN ? AND ?', [data.startDate, data.endDate], function(err, rows){

            if(rows != null && rows.length > 0) {

                let date = new Date(rows[0].date);
                let date_aux = date;
                let suma_temp = 0;
                let promedio_temp = 0;
                let contador = 0;
                let obj;
                let temperaturas_promedio = [];

                if(data.download == true){
                    socket.emit('tempCSV', {temp: rows});
                }

                let i = 0;

                while(i < rows.length){

                    while(date_aux - date < 3600*1000 && i+contador < rows.length){

                        suma_temp += rows[i+contador].temperature;

                        contador++;

                        if( i+contador <= rows.length-1){
                            date_aux = new Date(rows[i+contador].date);
                        }
                    }



                    promedio_temp = suma_temp / contador;

                    obj = rows[i]
                    obj.temperature = promedio_temp;
                    temperaturas_promedio.push(obj);

                    date = date_aux;
                    i += contador;
                    contador=0;
                    suma_temp=0;

                }
               
                socket.emit('tempUpdate', temperaturas_promedio);
                
            }
            
        });
    });

    //----------------Sockets de configuracion---------------------//

    let sql = 'UPDATE config SET config = (?) WHERE rowid = ';

    socket.on('config-temp-range', function(data){
        
        db.run(sql + CONFIG.TEMP_MIN, [data.min_temp], (err) => {
            if(err){
                return console.log(err);
            }
        });

        db.run(sql + CONFIG.TEMP_MAX, [data.max_temp], (err) => {
            if(err){
                return console.log(err);
            }
        });


    });

    socket.on('config-tiempo-muestras', function(data){
        
        db.run(sql + CONFIG.TIEMPO_MUESTREO, [data.muestras_tiempo], (err) => {
            if(err){
                return console.log(err);
            }
        });


    });

    socket.on('config-email', function(data){
        db.run(sql + CONFIG.EMAIL, [data.email], (err) => {
            if(err){
                return console.log(err);
            }
        });
    });

    socket.on('config-tiempo-alerta', function(data){
        db.run(sql + CONFIG.TIEMPO_ALARMAS, [data.alerta_tiempo], (err) => {
            if(err){
                return console.log(err);
            }
        });
    });
    

});

let socket;

let sql = "SELECT rowid FROM test WHERE date > '2020-09-11 19:40:00' "

// db.all(sql, function(err,rows){
//     console.log(rows)
// })

setInterval(function() {

    for(let i in SOCKET_LIST){
        socket = SOCKET_LIST[i];

        db.all('SELECT * from config', function(err, rows){
            if(err){
                console.log(err);
            }else{
                socket.emit('config-update', {rows: rows});
            }
        })

        // socket.emit('config-update', {tiempo_muestreo: tiempo_muestreo, tiempo_alerta: tiempo_alerta, 
                                    //   email: email, temp_min: MIN_TEMP, temp_max: MAX_TEMP});
    }


    db.all('SELECT * FROM test ORDER BY date DESC LIMIT 1', function(err, rows){

        if(err != null) console.log(err);
        
        for(let i in SOCKET_LIST){
            socket = SOCKET_LIST[i];

            if(rows != null){
                socket.emit('lastTemp', {temp: rows[0], min_temp: MIN_TEMP, max_temp: MAX_TEMP} );
            }
        }
    
    });
       

}, 1000);

