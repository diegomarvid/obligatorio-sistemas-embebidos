const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const CryptoJS = require("crypto-js");
const { rootCertificates } = require('tls');

let MAX_TEMP = 90;
let MIN_TEMP = 5;

const USER = 'root';
const KEY = 'admin';

let tiempo_muestreo = 5;

let config_encrypt_str = CryptoJS.AES.encrypt(USER,KEY).toString();

//Sacar los + y / para no tener rutas erroneas
config_encrypt_str = config_encrypt_str.split('+').join('');

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

            if(rows != null && rows.length > 0) {

                let date = new Date(rows[0].date);
                let date_aux = date;
                let suma_temp = 0;
                let promedio_temp = 0;
                let contador = 1;
                let obj;
                let temperaturas_promedio = [];

                if(data.download == true){
                    socket.emit('tempCSV', {temp: rows});
                }

                for(let i = 0; i < rows.length; i++){

                    if(date_aux - date < 3600*1000){

                        if(date_aux - date != 0){
                            contador++;
                        }

                        if(i != rows.length - 1){
                            date_aux = new Date(rows[i+1].date);
                        }
                        //Estoy en el ultimo y no termino la hora 
                        else{
                            date_aux = date;
                            suma_temp += rows[i].temperature;
                            promedio_temp = suma_temp / contador;
                            //Primer caso de borde
                            if(i - contador == -1){
                                obj = rows[i - contador + 1];
                            } else if(i - contador -1 != -1){
                                obj = rows[i - contador - 1];
                            }                          
                            else{
                                obj = rows[i - contador];
                            }
                            obj.temperature = promedio_temp;
                            temperaturas_promedio.push(obj);
                        }

                        suma_temp += rows[i].temperature;
                    
                    } 
                    else{
                        date = date_aux;
                        promedio_temp = suma_temp / contador;

                        //Primer caso de borde
                        if(i - contador -1 != -1){
                            obj = rows[i - contador - 1];
                        } else{
                            obj = rows[i - contador];
                        }
                        
                        obj.temperature = promedio_temp;
                        temperaturas_promedio.push(obj);
                        contador = 1;
                        suma_temp = 0;
                    }

                }

                socket.emit('tempUpdate', temperaturas_promedio);
                
            }
            
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

let sql = "SELECT rowid FROM test WHERE date > '2020-09-11 19:40:00' "

// db.all(sql, function(err,rows){
//     console.log(rows)
// })

setInterval(function() {

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

