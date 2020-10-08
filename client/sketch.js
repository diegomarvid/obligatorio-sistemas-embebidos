let socket = io();

let loginState = true;  

let loginDiv = document.getElementById('loginDiv');
let controlDiv = document.getElementById('controlDiv');
let containerDiv = document.getElementById('containerDiv');
var ctx = document.getElementById('myChart').getContext('2d');


let start_date = "";
let end_date = "";

let temp_actual = 20;

let TEMP_MIN = 5;
let TEMP_MAX = 80;

let config_link = "";

socket.on('config_update', function(data){

    let estado;

    for(let i in data.rows){
        if(data.rows[i].id == 6){
            estado = data.rows[i].atr;   
            break;
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
})

function wait(ms){
    var start = new Date().getTime();
    var end = start;
    while(end < start + ms) {
      end = new Date().getTime();
   }
 }

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

function login(){
    let username = $('#username_id').val();
    let password = $('#password_id').val();
    socket.emit('logIn', {username: username, password: password});
    return;
}

socket.on('logInResponse', function(data) {
    if(data.success) {
        Notiflix.Loading.Standard();
        Notiflix.Loading.Remove(1000);

        setTimeout(function(){
            $("body").css("background","#DCDCDC");
            loginState = false;
            loginDiv.style.display = 'none';
            containerDiv.style.display = 'inline';
            document.getElementById('config-id').setAttribute("href",data.config_link);
            TEMP_MIN = data.min_temp;
            TEMP_MAX = data.max_temp;
        }, 1000)
        
    } else{
        Notiflix.Notify.Failure('Usuario o contraseña invalido');
        $('#username_id').focus();
    }

});

let pis = [];
let pis_off = [];

function create_html_card(user, online = true){

    let state_html = '"online_icon"';
    let state_txt_html = 'online';

    if(online == false){
        state_html = '"online_icon offline"';
        state_txt_html = 'offline'
    }

    let html1 = '<li>' + '<div class="d-flex bd-highlight">' + '<div class="img_cont">'
          + '<img src="/client/resources/fondo.jpg" class="rounded-circle user_img">'
          + '<span class=' + state_html +'></span>' + '</div>'
          +  '<div class="user_info">'  + '<span>';
    let html2 = '</span>' + '<p>';
    let html3 = ' is ' + state_txt_html + '</p>'  +  '</div>  ' + '</div>' + '</li>'    
    return html1 + user + html2 + user + html3;
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

socket.on('tempCSV', function(data){
    downloadCSV({ filename: "temperaturas.csv" }, data.temp);
})

$('input[name="datetimes"]').on('apply.daterangepicker', function(ev, picker) {
    start_date = picker.startDate.format('YYYY-MM-DD H:mm:00');
    end_date = picker.endDate.format('YYYY-MM-DD H:mm:00');    
    console.log(start_date, end_date)
});

$('#date-range-confirm').click(function(){
    let download = $('#downloadCheck').is(":checked");
    socket.emit('dateRange', {startDate: start_date, endDate: end_date, download: download});
})

Notiflix.Block.Init({
    backgroundColor:'#DCDCDC',
    messageColor:'#0',
    svgSize:'20px'
});

$('#alarma-id').click(function(){
    let estado = $('#alarma-id').is(':checked');
    Notiflix.Block.Circle('div#alarma-div', 'Loading...');
    Notiflix.Block.Remove('div#alarma-div', 1600);
    socket.emit('activar-alarma', {estado: estado});

    let html =  '<li>' + '<div class="d-flex bd-highlight">' + '<div class="img_cont">'
    + '<img src="/client/resources/fondo.jpg" class="rounded-circle user_img">'
   + '<span class="online_icon"></span>' +  '</div>'
   + '<div class="user_info">' + '<span>Khalid</span>' + '<p>Kalid is online</p>'
   + '</div>' + '</div>' +'</li>';
               
                
    $('#test').append(html);


});



google.charts.load('current', {'packages':['gauge']});
google.charts.setOnLoadCallback(drawChart);

              
function drawChart() {

    chart = new google.visualization.Gauge(document.getElementById('chart_div'));

    var options = {
        width: 220, height: 220,
        redFrom: TEMP_MAX, redTo: 100,
        greenColor: '#6A99FF',
        greenFrom:0, greenTo: TEMP_MIN,
        minorTicks: 5
    };


    socket.on('lastTemp', function(data){

        // temp_actual = data.temp.temperature;
        temp_actual = data.temp
        
        TEMP_MIN = data.min_temp;
        TEMP_MAX = data.max_temp;

        options = {
            width: 220, height: 220,
            redFrom: TEMP_MAX, redTo: 100,
            greenColor: '#6A99FF',
            greenFrom:0, greenTo: TEMP_MIN,
            minorTicks: 5
        };

        var data = google.visualization.arrayToDataTable([
            ['Label', 'Value'],
            ['ºC', temp_actual]
        ]);

        chart.draw(data, options);

        
    });


}

let n = 0;

let temperatures = [];
let hours = [];
socket.on('tempUpdate', function(data) {

    temperatures = [];
    hours = [];
   
    for (let i in data) {
        temperatures.push(data[i].temperature);
        str = data[i].date.substring(0,19);
        hours.push(str)
        
    }

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
                text: 'Temperaturas del sensor analogico'
            },
            legend:{
                display: false
            },
            scales: {
                yAxes: [{
                  scaleLabel: {
                    display: true,
                    labelString: 'Temperatura (°C)'
                  }
                }]
              }     
        }
    });
    
});

              



document.oncontextmenu = function(event) {
    event.preventDefault();
}

