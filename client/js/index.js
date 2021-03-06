//Variable de socket
let socket = io();

//Estado de inicio de sesion
let loginState = true;  

//Elementos HTML
let loginDiv = document.getElementById('loginDiv');
let controlDiv = document.getElementById('controlDiv');
let containerDiv = document.getElementById('containerDiv');
var ctx = document.getElementById('myChart').getContext('2d');
google.setOnLoadCallback(init_gauge);

$( document ).ready(function() {
    $("#sortable").sortable();
    $("#sortable").disableSelection();
 });

//Variables de inicializacion
let start_date = "";
let end_date = "";

let temp_actual = 20;

let chart_analogico;
let chart_digital;
let chart_luz;

let TEMP_MIN_A = 5;
let TEMP_MAX_A = 80;
let TEMP_MIN_D = 5;
let TEMP_MAX_D = 80;
let TEMP_MIN_L = 5;
let TEMP_MAX_L = 80;

let temp_actual_a = 0;
let temp_actual_d = 0;
let temp_actual_l = 0;

let led_prendido = false;

let config_link = "";

socket.emit('ip_client', {ip: ip, sens: null});

function init_gauge(){

    try{
        chart_analogico = new google.visualization.Gauge(document.getElementById(`chart_analogico`));
        chart_digital = new google.visualization.Gauge(document.getElementById(`chart_digital`));
        chart_luz = new google.visualization.Gauge(document.getElementById(`chart_luz`));
    } catch(err){
        console.log(err);
        console.log("Intente reiniciar la pagina")
        location.reload();
    }
    

}

//Funcion para actualizar gauge de temperatura
function actualizar_gauge(temp, sens, temp_min, temp_max){

    let unidad = 'ºC';

    //Limite de valores
    let MIN = 0;
    let MAX = 100;

    //Variacion de variables acorde a sensor
    if(sens == 'luz'){
        unidad = 'lux';
        MAX = 10000;
    }

    try {
       
        options = {
            width: 220, height: 220,
            redFrom: temp_max, redTo: MAX,
            greenColor: '#6A99FF',
            greenFrom:0, greenTo: temp_min,
            minorTicks: 5,
            min: MIN,
            max: MAX
        };
    
        var data = google.visualization.arrayToDataTable([
            ['Label', 'Value'],
            [unidad, temp]
        ]);
    
        //Dependiendo del sensor escribir en X gauge
        if(sens == 'analogico'){
            chart_analogico.draw(data, options);
        } else if(sens == 'digital'){
            chart_digital.draw(data, options);
        } else if(sens == 'luz'){
            chart_luz.draw(data, options);
        }
        


    } catch(error){
        console.log(error)
        console.log("Intente reiniciar la pagina")
        location.reload();
    }
    
   
}

//---------------Manejo del boton de LED---------------------//
$('#ledbtn').click(function(){
    

    if(led_prendido == true){
        $(this).blur();
        led_prendido = false;
        socket.emit('activar-led', {estado: led_prendido});
    }else{
        $(this).blur();
        led_prendido = true;
        socket.emit('activar-led', {estado: led_prendido});
    }

    
});

socket.on('update_estado_led', function(data){

    

    //Si hay solo 1 pagina abierta es redudante, pero le sirve al que no apreto el boton
    led_prendido = data.estado_led;

    //Convertir de str a boolean
    if(led_prendido == 'true'){
        led_prendido = true;
    } else if(led_prendido == 'false'){
        led_prendido = false;
    }


    if(led_prendido == true){
        $('#ledbtn').removeClass();
        $('#ledbtn').addClass('btn btn-success');
        $('#ledbtn').html('LED Prendido');
        
    }else{
        $('#ledbtn').removeClass();
        $('#ledbtn').addClass('btn btn-danger');
        $('#ledbtn').html('LED Apagado');
    }

})

//-----------------------------------------------------------//

socket.on('disconnect', function(data){
    console.log('se fue el server');
    location.reload();
})

//Variables de configuracion SOLO actualizada al INICIO DE SESION
socket.on('config_update', function(data){

    console.log('update de config')
 
    let estado;

    for(let i in data.rows){
        if(data.rows[i].id == 6 && data.rows[i].sens == null){
            estado = data.rows[i].atr;   
        }
        if(data.rows[i].id == 1 && data.rows[i].sens == 'analogico'){
            TEMP_MIN_A = data.rows[i].atr;
        }
        if(data.rows[i].id == 2 && data.rows[i].sens == 'analogico'){
            TEMP_MAX_A = data.rows[i].atr;
        }
        if(data.rows[i].id == 1 && data.rows[i].sens == 'digital'){
            TEMP_MIN_D = data.rows[i].atr;
        }
        if(data.rows[i].id == 2 && data.rows[i].sens == 'digital'){
            TEMP_MAX_D = data.rows[i].atr;
        }
        if(data.rows[i].id == 1 && data.rows[i].sens == 'luz'){
            TEMP_MIN_L = data.rows[i].atr;
        }
        if(data.rows[i].id == 2 && data.rows[i].sens == 'luz'){
            TEMP_MAX_L = data.rows[i].atr;
        }
        if(data.rows[i].id == 6 && data.rows[i].sens == 'luz'){
            led_prendido = data.rows[i].atr;
        }

    }
    
    if(estado == 'true'){
        $('#alarma-txt-id').text('Alarma activada');
        estado = true;    
    } else{
        $('#alarma-txt-id').text('Alarma desactivada');
        estado = false;
    }

    $('#alarma-id').prop('checked',estado);

    //Parseando a booleana por si viene en str de la db
    if(led_prendido == 'true'){
        led_prendido = true;
    }else if(led_prendido == 'false'){
        led_prendido = false;
    }
    
    if(led_prendido == true){
        $('#ledbtn').removeClass();
        $('#ledbtn').addClass('btn btn-success');
        $('#ledbtn').html('LED Prendido');
    }else{
        $('#ledbtn').removeClass();
        $('#ledbtn').addClass('btn btn-danger');
        $('#ledbtn').html('LED Apagado');
    }

})



socket.on('update_temp_range', function(data){

    let temp_actual;

    //Actualizo variables globales
    if(data.sens == 'analogico'){
        temp_actual = temp_actual_a;
        TEMP_MIN_A = data.min_temp;
        TEMP_MAX_A = data.max_temp;

    }else if(data.sens == 'digital'){
        temp_actual = temp_actual_d;
        TEMP_MIN_D = data.min_temp;
        TEMP_MAX_D = data.max_temp;
    }else{
        temp_actual = temp_actual_l;
        TEMP_MIN_L = data.min_temp;
        TEMP_MAX_L = data.max_temp;
    }

    console.log(temp_actual, data.sens)

    //Actualizo gauge
    actualizar_gauge(temp_actual, data.sens, data.min_temp, data.max_temp)

})

//Variable de estado alarma cuando se detecta un cambio
socket.on('update_estado_alarma', function(data){

    let estado = data.estado_alarma;

    if(estado == true){
        console.log(typeof estado)
        $('#alarma-txt-id').text('Alarma activada');
        estado = true;    
    } else{
     
        console.log(typeof estado)
        $('#alarma-txt-id').text('Alarma desactivada');
        estado = false;
    }

    $('#alarma-id').prop('checked',estado);

});

function wait(ms){
    var start = new Date().getTime();
    var end = start;
    while(end < start + ms) {
      end = new Date().getTime();
   }
 }


//Codigo para armar csv
function convertArrayOfObjectsToCSV(args) {  
    var result, ctr, keys, columnDelimiter, lineDelimiter, data;

    data = args.data || null;
    if (data == null || !data.length) {
        return null;
    }

    columnDelimiter = args.columnDelimiter || ',';
    lineDelimiter = args.lineDelimiter || '\n';

    keys = Object.keys(data[0]);

    result = '';
    result += keys.join(columnDelimiter);
    result += lineDelimiter;

    data.forEach(function(item) {
        ctr = 0;
        keys.forEach(function(key) {
            if (ctr > 0) result += columnDelimiter;

            result += item[key];
            ctr++;
        });
        result += lineDelimiter;
    });

    return result;
}

//Codigo para descargar csv
function downloadCSV(args, arr) {  
    var data, filename, link;
    var csv = convertArrayOfObjectsToCSV({
        data: arr
    });
    if (csv == null) return;

    filename = args.filename || 'export.csv';

    if (!csv.match(/^data:text\/csv/i)) {
        csv = 'data:text/csv;charset=utf-8,' + csv;
    }
    data = encodeURI(csv);

    link = document.createElement('a');
    link.setAttribute('href', data);
    link.setAttribute('download', filename);
    link.click();
}


//-------------------------------Actualizacion de chat-----------------------------------//

let pis = [];
let pis_off = [];

let users = [];

//Funcion para hacer html de usuario de chat
function create_html_card(user, online = true, img = '"/client/resources/fondo.jpeg"'){

    let state_html = '"online_icon"';
    let state_txt_html = 'online';

    let user_arr = user.split('_');
    let username = user_arr[0];
    let sens = user_arr[1];

    if(sens == 'analogico'){
        img = '"/client/resources/ntc.jpg"'
    } else if(sens == 'digital'){
        img = '"/client/resources/digital.jpg"'
    } else if(sens == 'luz'){
        img = '"/client/resources/ldr.jpg"'
    }

    if(online == false){
        state_html = '"online_icon offline"';
        state_txt_html = 'offline'
    }

    let html1 = '<li>' + '<div class="d-flex bd-highlight">' + '<div class="img_cont">'
          + '<img src=' +  img + 'class="rounded-circle user_img">'
          + '<span class=' + state_html +'></span>' + '</div>'
          +  '<div class="user_info">'  + '<span>';
    let html2 = '</span>' + '<p>';
    let html3 = ' is ' + state_txt_html + '</p>'  +  '</div>  ' + '</div>' + '</li>'    
    return html1 + username + html2 + username + html3;
}

function show_chat(){
     //Primero muestro los conectados
    for(let i in pis){      
        id = '#test' + i;
        html = create_html_card(pis[i], true);
        $(id).html(html)        
    }
    //Despues los desconectados
    for(let i in pis_off){
        let index = parseInt(i) + pis.length;
        id = '#test' + index;
        html = create_html_card(pis_off[i], false);
        $(id).html(html)           
    }
}

function show_user_chat(){

    for(let i in users){      
        id = '#chat' + i;
        html = create_html_card(users[i], true, '"/client/resources/user_icon.jpeg"');
        $(id).html(html)        
    }
    //Eliminar el resto hasta el maximo de 4
    for(let i = users.length; i <= 4; i++){
        id = '#chat' + i;
        $(id).empty();    
    }

}

socket.on('init_pis', function(data){

    //Creo array de conectados y desconectados
    for(let i in data.users){
        if(data.users[i] == 'online'){
            pis[pis.length] = i;
        } else{
            pis_off[pis_off.length] = i;
        }
    }
    
    show_chat();
   

})
    

socket.on('new_pi', function(data){

    //Lo agrego a la lista de conectados
    if(pis.indexOf(data.user) < 0){
        pis.push(data.user)
   
    }

    //Lo saco de la lista de desconectados
    pis_off = pis_off.filter(e => e !== data.user)

    show_chat();
    console.log(pis, pis_off)
    
    
});
socket.on('delete_pi', function(data){

    //Lo agrego a la lista de desconectados
    if(pis_off.indexOf(data.user) < 0){
        pis_off.push(data.user)
    }
    

    //Lo saco de la lista de conectados
    pis = pis.filter(e => e !== data.user)

    show_chat();
    console.log(pis, pis_off)
    
});

//----------------------------------------------------------------------------------------//

socket.on('update_client_chat', function(data){
    
    users = data.users;

    show_user_chat();
    
})

//----------------------------------------------------------------------------------------//

//Descargar csv con la informacion de server
socket.on('tempCSV', function(data){
    downloadCSV({ filename: "temperaturas.csv" }, data.temp);
})

//Cuando apretan boton de apply, se guardan las fechas
$('input[name="datetimes"]').on('apply.daterangepicker', function(ev, picker) {
    start_date = picker.startDate.format('YYYY-MM-DD H:mm:00');
    end_date = picker.endDate.format('YYYY-MM-DD H:mm:00');    
});

//Cuando apretan boton de enviar, se envian las fechas al servidor
$('#date-range-confirm-analogico').click(function(){
    let download = $('#downloadCheck').is(":checked");
    socket.emit('dateRange', {startDate: start_date, endDate: end_date, download: download, sens: 'analogico'});
})
//Cuando apretan boton de enviar, se envian las fechas al servidor
$('#date-range-confirm-digital').click(function(){
    let download = $('#downloadCheck').is(":checked");
    socket.emit('dateRange', {startDate: start_date, endDate: end_date, download: download, sens: 'digital'});
})
//Cuando apretan boton de enviar, se envian las fechas al servidor
$('#date-range-confirm-luz').click(function(){
    let download = $('#downloadCheck').is(":checked");
    socket.emit('dateRange', {startDate: start_date, endDate: end_date, download: download, sens: 'luz'});
})


//Mandar estado de alarma al servidor
$('#alarma-id').click(function(){
    let estado = $('#alarma-id').is(':checked');

    socket.emit('activar-alarma', {estado: estado});

});

//Actualizacion de ultima temperatura
socket.on('lastTemp_analogico', function(data){

    temp_actual_a = data.temp;

    actualizar_gauge(data.temp, 'analogico', TEMP_MIN_A, TEMP_MAX_A);

});

socket.on('lastTemp_digital', function(data){

    temp_actual_d = data.temp;

    actualizar_gauge(data.temp, 'digital', TEMP_MIN_D, TEMP_MAX_D);

});

socket.on('lastTemp_luz', function(data){

    temp_actual_l = data.temp;

    actualizar_gauge(data.temp, 'luz', TEMP_MIN_L, TEMP_MAX_L);

});
              

let temperatures = [];
let hours = [];
socket.on('plotUpdate', function(data) {

    temperatures = [];
    hours = [];
   
    for (let i in data.temp) {
        //Obtener array de temperatura
        temperatures.push(data.temp[i].temperature);
        //Sacar milisegundos de fecha
        str = data.temp[i].date.substring(0,19);
        //Obtener array de horas
        hours.push(str)
        
    }

    let titulo = 'Temperaturas del sensor analogico';
    let unidad = 'Temperatura (°C)';

    if(data.sens == 'luz'){
        titulo = 'Temperaturas del sensor de luz';
        unidad = 'Luz (lux)'
    }else if(data.sens == 'digital'){
        titulo = 'Temperaturas del sensor digital';

    }

    //Actualizar grafica
    var stackedLine = new Chart(ctx, {
        type: 'line',
        data: {
            labels: hours,
            datasets: [{
                data: temperatures
            }]
        },
        options: {
            responsive: true,
            title:{
                display: true,
                text: titulo
            },
            legend:{
                display: false
            },
            scales: {
                yAxes: [{
                  scaleLabel: {
                    display: true,
                    labelString: unidad
                  }
                }]
              }     
        }
    });
    
});

              
document.oncontextmenu = function(event) {
    event.preventDefault();
}

