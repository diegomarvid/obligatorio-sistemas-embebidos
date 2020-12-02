const express = require('express');
const { Pool } = require('pg');
var Fingerprint = require('express-fingerprint');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');


const pool = new Pool({
    connectionString: process.env.DATABASE_URL  || 'postgres://bpnglisbxsblsw:9f0fd7e900530dc873613357b58a653b4ca786f8165d79e62ec91714807abd0e@ec2-52-73-199-211.compute-1.amazonaws.com:5432/dfhs19f5g32p3h',
    ssl: {
      rejectUnauthorized: false
    }
  });


pool.connect((err, client, release) => {
    if(err){
        console.error(err.stack)
    } else{
        console.log('exito al conectar a la db')     
    }

    
});

const saltRounds = 5;

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
    if (req.get('X-Forwarded-Proto')=='https' || req.hostname == 'localhost' ||  req.hostname == '192.168.0.104' ) {
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

    if(includes_ip(ip)){
        res.redirect('/');
    } else{
        res.render('login.ejs', {ip: ip});
    }

    
});

//Pagina de register
app.get('/register', function(req, res){

    //Obtener hash identificador
    const ip = req.fingerprint.hash;

    res.render('register.ejs', {ip: ip});


    
});

//Pagina de login
app.get('/logout', function(req, res){

    //Obtener hash identificador
    const ip = req.fingerprint.hash;

    if(includes_ip(ip)){
        login_ips = login_ips.filter(x => x.ip !== ip);      
    } 
    res.redirect('/login');

});

app.post('/login', async function(req, res){
 
    let username = req.body.username;
    let password = req.body.password;

    if(req.body.action == 'Register'){
        res.redirect('/register');
    } else{
        let ip = req.fingerprint.hash;

    let check_login = await check_correct_login(username, password);
     
    let user_connected = is_user_connected(username, ip);

    if(check_login && !user_connected){

        if(!includes_ip(ip)){
            login_ips.push({ip: ip, last_login: new Date(), user: username});
        }
        res.clearCookie('login')   
        res.redirect('/');
        } 
    else{
    
        if(!check_login){
            res.cookie('login', 'invalid username or password',{expires: new Date(Date.now() + 2000)} );
        }else{
            res.cookie('login', `${username} is already connected`,{expires: new Date(Date.now() + 2000)} );
        }
        
        res.redirect('/login');
    }
    }
   
    
  

});
  


app.post('/register', function(req, res){

    let username = req.body.username;
    let password = req.body.password;

    let ip = req.fingerprint.hash;

    // //Verify if exist users
    pool.query('select * from users where username = ($1)', [username], (err, resp) => {
        if(err){
            console.log('error 1')
            return console.log(err);
        }else{

            if(resp.rows.length > 0){
                res.cookie('register', 'Ya existe un usuario con ese nombre', {expires: new Date(Date.now() + 2000)});
                res.redirect('/register');
            } else{

                //Hash password
                bcrypt.hash(password, saltRounds, (err, hash_pass) => {

                    if(err){
                        console.log('error 2')
                        console.log(err)
                    }

                    //Guardar usuario en la db
                    pool.query("INSERT INTO users values ($1,$2)", [username, hash_pass], (err) => {
                    
                        if(err){
                            console.log('error 3')
                            return console.log(err);
                        }

                        res.clearCookie('register');
                        res.redirect('/login');
                    });

                });
            
            }
        }
    });



})

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

    let {sens} = req.query;

    let magnitud = 'Temperatura';
    let unidad = 'ºC';
    //Digitos de maxima unidad
    //En temperatura hasta 99
    let max_magnitud = 2;

    if(sens == 'luz'){
        magnitud = "Luz";
        unidad = 'lux'
        //Se puede luz hasta 9999lux
        max_magnitud = 4;
    }

    //Proteccion por si el usuario cambia el query
    if(!is_valid_sensor(sens)){
        sens = 'analogico';
    }
  
    if(includes_ip(ip)){

        if(!login_timeout(new Date(), ip)){
            res.render('config.ejs', 
                    {   ip: ip, 
                        sens: sens,
                        magnitud: magnitud,
                        unidad: unidad,
                        max_magnitud: max_magnitud
                    });
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


async function check_correct_login(username, password){

    let pass_hash;

    try {
        const {rows} = await pool.query('select * from users where username = $1', [username]);
 
        //Existe el cliente
        if(rows.length > 0){
            pass_hash = rows[0].password;
            
            // Verificar pass correcta
            const compare = await new Promise((resolve, reject) => {

                bcrypt.compare(password, pass_hash, function(err, res) {
                    if(err){
                        reject(err);
                    } else{
                        resolve(res);
                    }
                });

            });

            return compare;
    
        }else{
            //No existe el cliente
            return false;
        }

    } catch(err){
        console.log('error 4')
        console.log(err);
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

function get_pi_sensor(username){
    return username.split('_')[1];
}

function is_valid_sensor(sensor){
    let valid_sensors = ['analogico', 'digital', 'luz'];
    return valid_sensors.includes(sensor);
}

function is_pi_username_correct(username){
    let starts_with_pi = username.substring(0,2) == 'pi';
    let is_repetead =  check_repetead_user(username);

    // let sensor = get_pi_sensor(username);
    let username_arr = username.split('_');

    let valid_sensor = false;

    //Username is pi_XXXX
    if(username_arr.length == 2){
        //agarro el sensor en ['pi1','analogico']
        valid_sensor = is_valid_sensor(username_arr[1]);
    }
    
    return starts_with_pi && !is_repetead && valid_sensor;
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
    let sens = null;

    //Identificador unico de conexion
    socket.id = Math.random();

    //Se agrega a la lista de clientes web
    SOCKET_LIST[socket.id] = socket;

    socket.on('ip_client', function(data){
        ip = data.ip;
        sens = data.sens;

        //Chat logic
        //Obtener nombre de usuario a traves de su ip
        user = get_user(ip);
        //El usuario "user" esta conectado
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

        //Mando el chat de raspberries
        socket.emit('init_pis', {users: ALL_USERS});

    });

    //Conexion de raspberry
    socket.on('data_connection', function(data){

        //Como no es cliente web lo remuevo de la lista
        delete SOCKET_LIST[socket.id];

        //Logica de inicio de sesion
        //Solo usuarios que empiezan con 'pi'
        if(is_pi_username_correct(data.id)){   

            sens = get_pi_sensor(data.id);

            console.log(`raspberry [${data.id.split('_')[0]}] connected in sensor [${sens}]`);

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


    //Mandar valores actuales de configuracion a nuevos clientes
    pool.query('SELECT * from config ORDER BY sens, id', function(err, res){
        if(err){
            console.log(err)
        }else{

            config_rows = res.rows

            socket.emit('config_update', {rows: config_rows});

            //Despues de mandar los valores de config actualizo los gadgets
            
                //Mando ultimo valor de temperatura a nuevo cliente
                //Selecciono la ultima temperatura de la tabla de temperaturas
                pool.query('SELECT * FROM temperatura_analogico ORDER BY date DESC LIMIT 1', function(err, res){
                    let last_temp = 0;
                    if(err) {
                        console.log(err);
                    } else{
                        if(res.rows.length > 0){
                            last_temp = res.rows[0].temperature;
                            socket.emit('lastTemp_analogico', {temp: last_temp});
                        } else{
                            socket.emit('lastTemp_analogico', {temp: -1});
                        }
                        
                    }

                });

                //Mando ultimo valor de temperatura a nuevo cliente
                //Selecciono la ultima temperatura de la tabla de temperaturas
                pool.query('SELECT * FROM temperatura_digital ORDER BY date DESC LIMIT 1', function(err, res){
                    let last_temp = 0;
                    if(err) {
                        console.log(err);
                    } else{
                        if(res.rows.length > 0){
                            last_temp = res.rows[0].temperature;
                            socket.emit('lastTemp_digital', {temp: last_temp})
                        } else{
                            socket.emit('lastTemp_digital', {temp: -1})
                        }
                    }

                });

                //Mando ultimo valor de temperatura a nuevo cliente
                //Selecciono la ultima temperatura de la tabla de temperaturas
                pool.query('SELECT * FROM luz ORDER BY date DESC LIMIT 1', function(err, res){
                    let last_temp = 0;
                    if(err) {
                        console.log(err);
                    } else{
                        if(res.rows.length > 0){
                            last_temp = res.rows[0].temperature;
                            socket.emit('lastTemp_luz', {temp: last_temp});
                        } else{
                            socket.emit('lastTemp_luz', {temp: -1});
                        }
                    }

                });

        }
        
    })

   
    
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

    socket.on('activar-led', function(data){

        //El estado del led usa id = 6 que es el mismo que config.estado_alarma
        //La diferencia es que esta asociado al sensor luz en vez de null
        pool.query('UPDATE config SET Atr = ($2) WHERE id = ($1) and sens = ($3)',[CONFIG.ESTADO_ALARMA, data.estado, 'luz'], (err) =>{
            if(err){
                return console.log(err);
            }
        })
       
        //Envio a todas las raspberries
        let socket;
        //Envio a las raspberries el nuevo valor actualizado
        for(let id in SOCKET_DATA_LIST){
            socket = SOCKET_DATA_LIST[id];
            socket.emit('update_estado_led', {estado_led: data.estado});
        }

        //Envio a todos los clientes web
        for(let id in SOCKET_LIST){
            socket = SOCKET_LIST[id];
            socket.emit('update_estado_led', {estado_led: data.estado});
        }

    })

    //Cuando llega del calendario de la pagina
    socket.on('dateRange', function(data){

        let table = "temperatura_" + data.sens;
        if(data.sens == 'luz'){
            table = data.sens;
        }

        pool.query(`SELECT * FROM ${table} WHERE date BETWEEN $1 AND $2 ORDER BY date`, [data.startDate, data.endDate], function(err, res){

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


                    //Calculo promedio y redondear a dos cifras despues de la coma
                    promedio_temp = (suma_temp / contador).toFixed(2);

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
                socket.emit('plotUpdate', {temp: temperaturas_promedio, sens: data.sens});
                
            }
            
        });
    });

    //---------------------------Sockets de configuracion---------------------------------//

    let sql2 = 'UPDATE config SET Atr = ($2) WHERE id = ($1) AND sens = ($3)';

    socket.on('config-temp-range', function(data){

        let min_temp = parseInt(data.min_temp);
        let max_temp = parseInt(data.max_temp);
       

        let socket;
        //Envio a las raspberries el nuevo valor actualizado
        for(let id in SOCKET_DATA_LIST){
            socket = SOCKET_DATA_LIST[id];
            socket.emit('update_temp_range', {min_temp: min_temp, max_temp: max_temp, sens: sens});
        }

        //Envio a los clientes web el nuevo valor actualizado
        for(let id in SOCKET_LIST){
            socket = SOCKET_LIST[id];
            socket.emit('update_temp_range', {min_temp: min_temp, max_temp: max_temp, sens: sens});
        }

        //Guardo los valores en la base de datos
        pool.query(sql2, [CONFIG.TEMP_MIN, min_temp, sens], (err, res) => {
            if(err){
                console.log(err)
             }
        })

        //Guardo los valores en la base de datos
        pool.query(sql2, [CONFIG.TEMP_MAX, max_temp, sens], (err, res) => {
            if(err){
                console.log(err)
             }
        })
        
        
    });

    socket.on('config-tiempo-muestras', function(data){

        let muestras_tiempo = parseInt(data.muestras_tiempo);

        let socket;
        //Envio a las raspberries el nuevo valor actualizado
        for(let id in SOCKET_DATA_LIST){
            socket = SOCKET_DATA_LIST[id];
            socket.emit('update_tiempo_muestras', {tiempo_muestras: muestras_tiempo, sens: sens});
        }

        //Envio a los clientes web el nuevo valor actualizado
        for(let id in SOCKET_LIST){
            socket = SOCKET_LIST[id];
            socket.emit('update_tiempo_muestras', {tiempo_muestras: muestras_tiempo, sens: sens});
        }

        //Guardar en la base de datos
        pool.query(sql2, [CONFIG.TIEMPO_MUESTREO, muestras_tiempo, sens], (err, res) => {
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
            socket.emit('update_email', {email: data.email, sens: sens});
        }

        //Envio a los clientes web el nuevo valor actualizado
        for(let id in SOCKET_LIST){
            socket = SOCKET_LIST[id];
            socket.emit('update_email', {email: data.email, sens: sens});
        }

        //Guardar en la base de datos
        pool.query(sql2, [CONFIG.EMAIL, data.email, sens], (err, res) => {
            if(err){
                console.log(err)
             }
        })

    });

    socket.on('config-tiempo-alerta', function(data){

        let alerta_tiempo = parseInt(data.alerta_tiempo);

        let socket;
        //Envio a las raspberries el nuevo valor actualizado
        for(let id in SOCKET_DATA_LIST){
            socket = SOCKET_DATA_LIST[id];
            socket.emit('update_tiempo_alerta', {tiempo_alerta: alerta_tiempo, sens: sens});
        }

        //Envio a los clientes web el nuevo valor actualizado
        for(let id in SOCKET_LIST){
            socket = SOCKET_LIST[id];
            socket.emit('update_tiempo_alerta', {tiempo_alerta: alerta_tiempo, sens: sens});
        }

        //Guarda en la base de datos
        pool.query(sql2, [CONFIG.TIEMPO_ALARMAS, alerta_tiempo, sens], (err, res) => {
            if(err){
                console.log(err)
             }
        })

    });

    //-------------------------------------------------------------------------------------------------------------//

    //Leer temperatura de las raspberries
    socket.on('python', function(data){

        let table = "temperatura_" + sens;
        if(sens == 'luz'){
            table = sens;
        }
        
        //Si esta habilitado para enviar proceso
        if(USERID_DATA_LIST[socket.id] != null){

            //Envio a todos los clientes la temperatura nueva
            let sock;
            for(let id in SOCKET_LIST){
                sock = SOCKET_LIST[id];
                sock.emit(`lastTemp_${sens}`, {temp: data.temp} );
            }

            pool.query(`INSERT INTO ${table} values ($1,$2,$3)`, [data.date, data.temp, USERID_DATA_LIST[socket.id]], (err) => {
                if(err){
                    return console.log(err);
                }
            });
           
        }


    })
    

});


