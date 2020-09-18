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

document.onkeydown = function (event) {


    //Enter username
    if(event.keyCode === 13 && loginState) {
        username_text = document.getElementById('username').value;
        if(username_text.length <= 2) return;
        socket.emit('logIn', {username: username_text});
    }

}

socket.on('logInResponse', function(data) {
    if(data.success) {
        loginState = false;
        loginDiv.style.display = 'none';
        containerDiv.style.display = 'inline';
        document.getElementById('config-id').setAttribute("href",data.config_link);
        TEMP_MIN = data.min_temp;
        TEMP_MAX = data.max_temp;
        console.log(TEMP_MIN, TEMP_MAX);
    } else{
        alert('log in unsuccessful');
    }

});

$('input[name="datetimes"]').on('apply.daterangepicker', function(ev, picker) {
    start_date = picker.startDate.format('YYYY-MM-DD H:mm:00');
    end_date = picker.endDate.format('YYYY-MM-DD H:mm:00');    
    console.log(start_date, end_date)
});

$('#date-range-confirm').click(function(){
    socket.emit('dateRange', {startDate: start_date, endDate: end_date});
})

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

    console.log(data)

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

