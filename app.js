const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const CryptoJS = require("crypto-js");
const { rootCertificates } = require('tls');
const { ALL } = require('dns');

let MAX_TEMP = 50;
let MIN_TEMP = 40;

const USER = 'root';
const KEY = 'admin';

const CONFIG = {
    TEMP_MIN: 1,
    TEMP_MAX: 2,
    TIEMPO_MUESTREO: 3,
    EMAIL: 4,
    TIEMPO_ALARMAS: 5,
    ESTADO_ALARMA: 6
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

app.get('/.well-known/pki-validation/1B5A3397F83271BD39D8721EFAC6C701.txt', function(req, res){
    res.sendFile(__dirname + '/1B5A3397F83271BD39D8721EFAC6C701.txt');
})

app.use('/client', express.static(__dirname + '/client'));

serv.listen(process.env.PORT || 8080, function() {
    console.log("Server listening at 8080");
});


function check_repetead_user(user){
    for(let i in SOCKET_DATA_LIST){
        if(user == SOCKET_DATA_LIST[i]){
            return true;
        }   
    }
    return false;
}




SOCKET_LIST = {};
SOCKET_DATA_LIST = {};
ALL_USERS = {};

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

    

    socket.on('data_connection', function(data){

        delete SOCKET_LIST[socket.id];


        if(data.id.substring(0,2) == 'pi' && check_repetead_user(data.id) == false){   
            console.log(`raspberry [${data.id}] connected`);
            socket.emit('data_connection_res', {success: true})
            SOCKET_DATA_LIST[socket.id] = data.id;
            ALL_USERS[data.id] = 'online';

            //Envio a las web que actualicen el chat
            for(let i in SOCKET_LIST){
                SOCKET_LIST[i].emit('new_pi', {user: data.id})
            }
            
        } else{
            socket.emit('data_connection_res', {success: false})
        }


    })

    socket.on('logIn', function(data) {
        if(data.username == USER && data.password == KEY){
            socket.emit('logInResponse', {success: true, config_link: config_encrypt_str, max_temp: MAX_TEMP, min_temp: MIN_TEMP});
            //Enviar listas de pis al conectarse
            socket.emit('init_pis', {users: ALL_USERS});
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
    
    socket.on('disconnect', function () {

        delete SOCKET_LIST[socket.id];

        let user_id = SOCKET_DATA_LIST[socket.id];
        //Si se desconecta una raspberry
        if(user_id != null) {
            //Cambio estado a offline
            ALL_USERS[user_id] = 'offline';
            //Envio a las web que actualicen el chat
            for(let i in SOCKET_LIST){
                SOCKET_LIST[i].emit('delete_pi', {user: user_id})
            }
            delete SOCKET_DATA_LIST[socket.id];   
        }

    });

    socket.on('activar-alarma', function(data){

        let sql = 'UPDATE config SET config = (?) WHERE rowid = ';
       
        db.run(sql + CONFIG.ESTADO_ALARMA, [data.estado], (err) => {
            if(err){
                return console.log(err);
            }
        });

    })

    socket.on('dateRange', function(data){



        db.all('SELECT * FROM test2 WHERE date BETWEEN ? AND ?', [data.startDate, data.endDate], function(err, rows){

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

    socket.on('python', function(data){
        
        //Si esta habilitado para enviar proceso
        if(SOCKET_DATA_LIST[socket.id] != null){
            db.run("INSERT INTO test2 values (?,?,?)", [data.date, data.temp, SOCKET_DATA_LIST[socket.id]], (err) => {
                if(err){
                    return console.log(err);
                }
            });
           
        }


    })
    

});


function getDate() {
    return new Date(new Date().toString().split('GMT')[0]+' UTC').toISOString().split('.')[0].replace('T',' ');
}

let sql = "SELECT rowid FROM test WHERE date > '2020-09-11 19:40:00' "

// db.all(sql, function(err,rows){
//     console.log(rows)
// })


let socket;
let last_temp;
let config_rows;

setInterval(function() {

    db.all('SELECT * from config', function(err, rows){
        if(err){
            console.log(err);
        }else{
            config_rows = rows;         
            MIN_TEMP = rows[0].config;
            MAX_TEMP = rows[1].config;
        }
    });

    db.all('SELECT * FROM test2 ORDER BY date DESC LIMIT 1', function(err, rows){

        if(err) {
            console.log(err);
        } else{
            last_temp = rows[0];
        }

    });
 
    for(let i in SOCKET_LIST){
        socket = SOCKET_LIST[i];
        socket.emit('config_update', {rows: config_rows});
        if(last_temp != null){
            socket.emit('lastTemp', {temp: last_temp, min_temp: MIN_TEMP, max_temp: MAX_TEMP} );
        }
    }


   
       

}, 800);

