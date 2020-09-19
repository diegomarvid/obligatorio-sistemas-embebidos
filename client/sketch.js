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

socket.on('config-update', function(data){

    console.log('actualizando')

    let estado = data.rows[5].config;

    if(estado == 1){
        estado = true;
        $('#alarma-txt-id').text('Alarma activada');
    } else{
        estado = false;
        $('#alarma-txt-id').text('Alarma desactivada');
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
    console.log(username, password)
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
            console.log(TEMP_MIN, TEMP_MAX);
        }, 1000)
        
    } else{
        Notiflix.Notify.Failure('Usuario o contraseña invalido');
        $('#username_id').focus();
    }

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



$('#alarma-id').click(function(){
    let estado = $('#alarma-id').is(':checked');
    socket.emit('activar-alarma', {estado: estado});
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

        temp_actual = data.temp.temperature;
        TEMP_MIN = data.min_temp;
        TEMP_MAX = data.max_temp;

        console.log(TEMP_MIN, TEMP_MAX)

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

