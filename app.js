const express = require('express');
const CryptoJS = require("crypto-js");
const { Pool } = require('pg');
var Fingerprint = require('express-fingerprint');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');



const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://bpnglisbxsblsw:9f0fd7e900530dc873613357b58a653b4ca786f8165d79e62ec91714807abd0e@ec2-52-73-199-211.compute-1.amazonaws.com:5432/dfhs19f5g32p3h',
    ssl: {
      rejectUnauthorized: false
    }
  });

pool.connect((err, client, release) => {
    if(err){
        console.error(err.stack)
    } else{
        console.log('exito al conectar')     
    }

    
});

const USER = 'root';
const KEY = 'admin';

let users = [{username: 'root', password: 'admin'},
             {username: 'root1', password: 'admin1'},
             {username: 'root2', password: 'admin2'},
             {username: 'root3', password: 'admin3'}
];

//En segundos -> equivale a media hora
const LOGIN_TIMEOUT = 30*60;

//ID asociado a atributo de configuracion
const CONFIG = {
    TEMP_MIN: 1,
    TEMP_MAX: 2,
    TIEMPO_MUESTREO: 3,
    EMAIL: 4,
    TIEMPO_ALARMAS: 5,
    ESTADO_ALARMA: 6
};

const app = express();

app.use(function(req,res,next) {

    //Heroku stores the origin protocol in a header variable. The app itself is isolated within the dyno and all request objects have an HTTP protocol.
    if (req.get('X-Forwarded-Proto')=='https' || req.hostname == 'localhost' ||  req.hostname == '192.168.0.111' ) {
        //Serve Angular App by passing control to the next middleware
        next();
    } else if(req.get('X-Forwarded-Proto')!='https' && req.get('X-Forwarded-Port')!='443'){
        //Redirect if not HTTP with original request URL
        res.redirect('https://' + req.hostname + req.url);
    }
  });

app.use(Fingerprint( { parameters:[
    Fingerprint.useragent,
    Fingerprint.geoip ]
}));

app.use(cookieParser());

app.use(bodyParser.urlencoded({ extended: true }));

app.set('views', __dirname + '/views');
app.engine('html', require('ejs').renderFile);

let serv = require('http').Server(app);

let login_ips = [];

//Pagina de login
app.get('/login', function(req, res){

    //Obtener hash identificador
    const ip = req.fingerprint.hash;

    // res.clearCookie('login')   

    res.render('login.ejs', {ip: ip});
});

app.post('/login', function(req, res){
 
    let username = req.body.username;
    let password = req.body.password;

    let ip = req.fingerprint.hash;
    
    if(check_correct_login(username, password) && !is_user_connected(username, ip)){

        if(!includes_ip(ip)){
            login_ips.push({ip: ip, last_login: new Date(), user: username});
        }
        res.clearCookie('login')   
        res.redirect('/');
    } else{

        if(!check_correct_login(username, password)){
            res.cookie('login', 'invalid username or password',{expires: new Date(Date.now() + 2000)} );
        }else{
            res.cookie('login', `${username} is already connected`,{expires: new Date(Date.now() + 2000)} );
        }
       
        res.redirect('/login');
    }

});

//Obtener pagina principal
app.get('/', function(req, res) {

    //Obtener hash identificador
    const ip = req.fingerprint.hash;

    
    if(includes_ip(ip)){

        if(!login_timeout(new Date(), ip)){
            res.render('index.ejs', {ip: ip});
        } else{
            //Elimino de la lista
            login_ips = login_ips.filter(x => x.ip !== ip);
            res.redirect('/login');
        }
        
    } else{
        res.redirect('/login');
    }
       
    
});

//Obtener pagina de configuracion
app.get('/config', function(req, res) {

    //Obtener hash identificador
    const ip = req.fingerprint.hash;

    if(includes_ip(ip)){

        if(!login_timeout(new Date(), ip)){
            res.render('config.ejs', {ip: ip});
        } else{
            //Elimino de la lista
            login_ips = login_ips.filter(x => x.ip !== ip);
            res.redirect('/login');
        }
        
    } else{
        res.redirect('/login');
    }
    
});

//Tramite de SSH
app.get('/.well-known/pki-validation/1B5A3397F83271BD39D8721EFAC6C701.txt', function(req, res){
    res.sendFile(__dirname + '/1B5A3397F83271BD39D8721EFAC6C701.txt');
})

//Codigo para devolver archivos
app.use('/client', express.static(__dirname + '/client'));

//Correr en puerto de HEROKU o local en 8080
serv.listen(process.env.PORT || 8080, function() {
    console.log("Server listening at 8080");
});

function check_correct_login(username, password){
    
    //check if user exists:
    let result = users.filter(x => x.username == username);

    if(result.length == 0){
        return false;
    }else if(result.length > 0 && result[0].password != password){
        return false;
    }else{
        return true;
    }


}

//Logica para verificar raspberries repetidas
function check_repetead_user(user){
    for(let i in USERID_DATA_LIST){
        if(user == USERID_DATA_LIST[i]){
            return true;
        }   
    }
    return false;
}

//Logica para verificar ip repetida
function includes_ip(ip){

    let result = login_ips.filter(x => x.ip == ip);

    return result.length > 0;

}

function login_timeout(date, ip){

    let now = date;

    let login_time = login_ips.filter(x => x.ip == ip);

    login_time = login_time[0].last_login;

    //Devuelve en milisegundos la diferencia
    let time_difference = now - login_time;
    time_difference /= 1000;

    return time_difference > LOGIN_TIMEOUT;

}

function is_user_connected(user, ip){

    let result = login_ips.filter(x => x.user == user);

    if(result.length == 0){
        return false;
    }else if(result.length > 0 && result[0].ip == ip){
        return false;
    } else{
        return true;
    }

}

function get_user(ip){
    let result = login_ips.filter(x => x.ip == ip);
    return result[0].user;
}


//Lista de sockets de clientes web
SOCKET_LIST = {};
//Lista de nombres de usuarios de raspberries
USERID_DATA_LIST = {};
//Lista de sockets de raspberries
SOCKET_DATA_LIST = {};
//Lista de todos los usuarios de raspberries que existieron
ALL_USERS = {};
//Lista de sockets con ip de clientes web
SOCKET_USERNAME_LIST = {};
let clients_connected = [];

let io = require('socket.io')(serv, {});

//Nueva conexion
io.sockets.on('connection', function(socket) {

    let ip = null;
    let user = null;

    //Identificador unico de conexion
    socket.id = Math.random();

    //Se agrega a la lista de clientes web
    SOCKET_LIST[socket.id] = socket;

    socket.on('ip_client', function(data){
        ip = data.ip;
        user = get_user(ip);
        SOCKET_USERNAME_LIST[socket.id] = user;
        
        //Si alguien nuevo entra mandar el estado nuevo a todos
        if(!clients_connected.includes(user)){
            clients_connected.push(user);
            let socket;
            for(let id in SOCKET_LIST){
                socket = SOCKET_LIST[id];
                socket.emit('update_client_chat', {users: clients_connected});
            }
        }
        //Si no es nuevo debo mandar el chat para que lo cargue igual
        else{
            socket.emit('update_client_chat', {users: clients_connected});
        }

    });

    //Conexion de raspberry
    socket.on('data_connection', function(data){

        //Como no es cliente web lo remuevo de la lista
        delete SOCKET_LIST[socket.id];

        //Logica de inicio de sesion
        //Solo usuarios que empiezan con 'pi'
        if(data.id.substring(0,2) == 'pi' && check_repetead_user(data.id) == false){   

            console.log(`raspberry [${data.id}] connected`);

            //Envio de conexion exitosa
            socket.emit('data_connection_res', {success: true})
            
            //Se agrega a las listas correspondientes
            USERID_DATA_LIST[socket.id] = data.id;
            SOCKET_DATA_LIST[socket.id] = socket;
            ALL_USERS[data.id] = 'online';

            //Envio a los clientes web que actualicen el chat
            for(let i in SOCKET_LIST){
                SOCKET_LIST[i].emit('new_pi', {user: data.id})
            }
            
        } else{
            //Conexion fallida con raspberry
            socket.emit('data_connection_res', {success: false})
        }


    })

    //Inicio de sesion
    socket.on('logIn', function(data) {

        //Si es el usuario correcto
        if(data.username == USER && data.password == KEY){
            socket.emit('logInResponse', {success: true});

            //Si inicio sesion y no estaba en la lista de login lo agrego
            if(login_ips.includes(ip) == false){
                login_ips.push(ip);
            }   

            //Enviar listas de pis al conectarse
            socket.emit('init_pis', {users: ALL_USERS});
        } else{
            socket.emit('logInResponse', {success: false});
        }
        
    });

    //Mandar valores actuales de configuracion a nuevos clientes
    pool.query('SELECT * from config', function(err, res){
        if(err){
            console.log(err)
        }else{

            config_rows = res.rows

            //Organizo por id para disminuir logica en raspberry
            config_rows.sort(function(a, b){
                return a.id - b.id;
            });

            socket.emit('config_update', {rows: config_rows});
        }
        
    })

    //Mando ultimo valor de temperatura a nuevo cliente
    //Selecciono la ultima temperatura de la tabla de temperaturas
    pool.query('SELECT * FROM test2 ORDER BY date DESC LIMIT 1', function(err, res){
        let last_temp = 0;
        if(err) {
            console.log(err);
        } else{
            last_temp = res.rows[0].temperature;
            socket.emit('lastTemp', {temp: last_temp})
        }

    });
    
    socket.on('disconnect', function () {

        delete SOCKET_LIST[socket.id];
        delete SOCKET_USERNAME_LIST[socket.id];

        let sigue_mi_ip = false;

        for(let id in SOCKET_USERNAME_LIST){
            if(SOCKET_USERNAME_LIST[id] == user){
                sigue_mi_ip = true;
                break;
            }
            
        }

        if(!sigue_mi_ip){
            clients_connected = clients_connected.filter(x => x !== user);
            let socket;
            for(let id in SOCKET_LIST){
                socket = SOCKET_LIST[id];
                socket.emit('update_client_chat', {users: clients_connected});
            }
            
        }



        let user_id = USERID_DATA_LIST[socket.id];
        //Si se desconecta una raspberry
        if(user_id != null) {
            //Cambio estado a offline
            ALL_USERS[user_id] = 'offline';
            //Envio a las web que actualicen el chat
            for(let i in SOCKET_LIST){
                SOCKET_LIST[i].emit('delete_pi', {user: user_id})
            }
            delete USERID_DATA_LIST[socket.id]; 
            delete SOCKET_DATA_LIST[socket.id];  
        }

    });

    socket.on('activar-alarma', function(data){

        pool.query('UPDATE config SET Atr = ($2) WHERE id = ($1)',[CONFIG.ESTADO_ALARMA, data.estado], (err) =>{
            if(err){
                return console.log(err);
            }
        })
       
        //Envio a todas las raspberries
        let socket;
        //Envio a las raspberries el nuevo valor actualizado
        for(let id in SOCKET_DATA_LIST){
            socket = SOCKET_DATA_LIST[id];
            socket.emit('update_estado_alarma', {estado_alarma: data.estado});
        }

        //Envio a todos los clientes web
        for(let id in SOCKET_LIST){
            socket = SOCKET_LIST[id];
            socket.emit('update_estado_alarma', {estado_alarma: data.estado});
        }

    })

    //Cuando llega del calendario de la pagina
    socket.on('dateRange', function(data){

        pool.query('SELECT * FROM test2 WHERE date BETWEEN $1 AND $2', [data.startDate, data.endDate], function(err, res){

            //Codigo de promediado de horas
            let rows = res.rows;

            if(rows != null && rows.length > 0) {

                let date = new Date(rows[0].date);
                let date_aux = date;
                let suma_temp = 0;
                let promedio_temp = 0;
                let contador = 0;
                let obj;
                let temperaturas_promedio = [];

                //Si el boton de descargar esta en ON, enviar el csv
                if(data.download == true){
                    socket.emit('tempCSV', {temp: rows});
                }

                let i = 0;

                //Mientras estoy en la lista de datos
                while(i < rows.length){
                    
                    //Mientras no paso una hora y no estoy en el final
                    while(date_aux - date < 3600*1000 && i+contador < rows.length){

                        //Agrega el valor de temperatura para promediar
                        suma_temp += rows[i+contador].temperature;

                        contador++;

                        //Si no estoy en el final, avanzo una fecha
                        if( i+contador <= rows.length-1){
                            date_aux = new Date(rows[i+contador].date);
                        }
                    }


                    //Calculo promedio
                    promedio_temp = suma_temp / contador;

                    //Obtengo la fecha de la primer temperatura
                    //Agarro el objeto para tener tambien la fecha y temperatura
                    obj = rows[i]
                    obj.temperature = promedio_temp;
                    temperaturas_promedio.push(obj);

                    //Actualizacion de variables
                    date = date_aux;
                    i += contador;
                    contador=0;
                    suma_temp=0;

                }
               
                //Mando array de promedios
                socket.emit('plotUpdate', temperaturas_promedio);
                
            }
            
        });
    });

    //---------------------------Sockets de configuracion---------------------------------//

    let sql2 = 'UPDATE config SET Atr = ($2) WHERE id = ($1)';

    socket.on('config-temp-range', function(data){

        let socket;
        //Envio a las raspberries el nuevo valor actualizado
        for(let id in SOCKET_DATA_LIST){
            socket = SOCKET_DATA_LIST[id];
            socket.emit('update_temp_range', {min_temp: data.min_temp, max_temp: data.max_temp});
        }

        //Envio a los clientes web el nuevo valor actualizado
        for(let id in SOCKET_LIST){
            socket = SOCKET_LIST[id];
            socket.emit('update_temp_range', {min_temp: data.min_temp, max_temp: data.max_temp});
        }

        //Guardo los valores en la base de datos
        pool.query(sql2, [CONFIG.TEMP_MIN, data.min_temp], (err, res) => {
            if(err){
                console.log(err)
             }
        })

        //Guardo los valores en la base de datos
        pool.query(sql2, [CONFIG.TEMP_MAX, data.max_temp], (err, res) => {
            if(err){
                console.log(err)
             }
        })
        
        
    });

    socket.on('config-tiempo-muestras', function(data){

        let socket;
        //Envio a las raspberries el nuevo valor actualizado
        for(let id in SOCKET_DATA_LIST){
            socket = SOCKET_DATA_LIST[id];
            socket.emit('update_tiempo_muestras', {tiempo_muestras: data.muestras_tiempo});
        }

        //Envio a los clientes web el nuevo valor actualizado
        for(let id in SOCKET_LIST){
            socket = SOCKET_LIST[id];
            socket.emit('update_tiempo_muestras', {tiempo_muestras: data.muestras_tiempo});
        }

        //Guardar en la base de datos
        pool.query(sql2, [CONFIG.TIEMPO_MUESTREO, data.muestras_tiempo], (err, res) => {
            if(err){
                console.log(err)
             }
        })
        
    });

    socket.on('config-email', function(data){

        let socket;
        //Envio a las raspberries el nuevo valor actualizado
        for(let id in SOCKET_DATA_LIST){
            socket = SOCKET_DATA_LIST[id];
            socket.emit('update_email', {email: data.email});
        }

        //Envio a los clientes web el nuevo valor actualizado
        for(let id in SOCKET_LIST){
            socket = SOCKET_LIST[id];
            socket.emit('update_email', {email: data.email});
        }

        //Guardar en la base de datos
        pool.query(sql2, [CONFIG.EMAIL, data.email], (err, res) => {
            if(err){
                console.log(err)
             }
        })

    });

    socket.on('config-tiempo-alerta', function(data){


        let socket;
        //Envio a las raspberries el nuevo valor actualizado
        for(let id in SOCKET_DATA_LIST){
            socket = SOCKET_DATA_LIST[id];
            socket.emit('update_tiempo_alerta', {tiempo_alerta: data.alerta_tiempo});
        }

        //Envio a los clientes web el nuevo valor actualizado
        for(let id in SOCKET_LIST){
            socket = SOCKET_LIST[id];
            socket.emit('update_tiempo_alerta', {tiempo_alerta: data.alerta_tiempo});
        }

        //Guarda en la base de datos
        pool.query(sql2, [CONFIG.TIEMPO_ALARMAS, data.alerta_tiempo], (err, res) => {
            if(err){
                console.log(err)
             }
        })

    });

    //-------------------------------------------------------------------------------------------------------------//

    //Leer temperatura de las raspberries
    socket.on('python', function(data){

        //Envio a todos los clientes la temperatura nueva
        let sock;
        for(let id in SOCKET_LIST){
            sock = SOCKET_LIST[id];
            sock.emit('lastTemp', {temp: data.temp} );
        }
        
        //Si esta habilitado para enviar proceso
        if(USERID_DATA_LIST[socket.id] != null){
            pool.query("INSERT INTO test2 values ($1,$2,$3)", [data.date, data.temp, USERID_DATA_LIST[socket.id]], (err) => {
                if(err){
                    return console.log(err);
                }
            });
           
        }


    })
    

});

let socket;

let ip;

// setInterval(function(){
    

    

//     // for(let id in SOCKET_LIST){

//     //     ip = SOCKET_USERNAME_LIST[id];

//     //     if(!ips_connected.includes(ip)){
//     //         ips_connected.push(ip)
//     //     }

//     //     // socket = SOCKET_LIST[id];
//     //     // socket.emit('update_client_chat', {users: login_ips});
//     // }

//     console.log(clients_connected)


// },1000);

