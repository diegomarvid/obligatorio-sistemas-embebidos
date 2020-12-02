let socket = io();

socket.emit('ip_client', {ip: ip, sens: sens});

Notiflix.Notify.Init({
    position: 'right-bottom'
});

socket.on('disconnect', function(data){
    console.log('se fue el server');
    location.reload();
})


function validateEmail(inputText)
{
    var mailformat = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
    return inputText.match(mailformat);                                            
}

$("#correo_id").keyup(function(e){
    
    if(validateEmail($(this).val()) != null) {           
        $(this).removeClass('is-invalid')
        $(this).addClass('is-valid')
    } else{
        $(this).removeClass('is-valid')
        $(this).addClass('is-invalid')
    }

});

$('#email-confirm').click(function(){
    let email = document.getElementById('correo_id').value;
    if(validateEmail(email) != null) {
        socket.emit('config-email', {email: email});

        Notiflix.Report.Success(
            'Exito',
            `Se actualizo de forma correcta el email de destino a: ${email}`,
            'Aceptar'
        );

    } else{
        $('#correo_id').focus();
        Notiflix.Notify.Failure('Correo invalido');
    }
});

$("#muestras_id").keyup(function(e){

    if($(this).val() >= 5) {           
        $(this).removeClass('is-invalid')
        $(this).addClass('is-valid')
    } else{
        $(this).removeClass('is-valid')
        $(this).addClass('is-invalid')
    }

});



$('#muestras-confirm').click(function(){

    if($("#muestras_id").val() >= 5){
        socket.emit('config-tiempo-muestras', {muestras_tiempo: parseInt($("#muestras_id").val())});
        Notiflix.Report.Success(
            'Exito',
            `Se actualizo de forma correcta el tiempo de muestreo a: ${$("#muestras_id").val()}`,
            'Aceptar'
        );
    }else{
        $("#muestras_id").focus();
        Notiflix.Notify.Failure('El tiempo entre muestras debe ser mayor a 5 segundos');
    }
});

$('#temp-range-confirm').click(function(){

    console.log("clicl")

   let min_temp = parseInt($("#min_temp_id").val());
   let max_temp = parseInt($("#max_temp_id").val());

    if($("#min_temp_id").val().length == 0){               
        $("#min_temp_id").focus();
        $("#min_temp_id").removeClass('is-valid');
        $("#min_temp_id").addClass('is-invalid');
        if(sens == 'luz'){
            Notiflix.Notify.Failure('Debe ingresar una intesidad de luz minima');
        } else{
            Notiflix.Notify.Failure('Debe ingresar una temperatura minima');
        }
        
    } else if($("#max_temp_id").val().length == 0){
        $("#max_temp_id").focus();
        $("#max_temp_id").removeClass('is-valid');
        $("#max_temp_id").addClass('is-invalid');

        if(sens == 'luz'){
            Notiflix.Notify.Failure('Debe ingresar una intesidad de luz maxima');
        }else{
            Notiflix.Notify.Failure('Debe ingresar una temperatura maxima');
        }
        
    } else if(min_temp >= max_temp){
        $("#min_temp_id").focus();
        $("#min_temp_id").removeClass('is-valid');
        $("#min_temp_id").addClass('is-invalid');
        $("#max_temp_id").removeClass('is-valid');
        $("#max_temp_id").addClass('is-invalid');

        if(sens == 'luz'){
            Notiflix.Notify.Failure('La intensidad de luz maxima debe ser mayor a la minima');
        }else{
            Notiflix.Notify.Failure('La temperatura maxima debe ser mayor a la minima');
        }

    }else{                             
        $("#min_temp_id").removeClass('is-invalid');
        $("#min_temp_id").addClass('is-valid');
        $("#max_temp_id").removeClass('is-invalid');
        $("#max_temp_id").addClass('is-valid');

        console.log("envio temperatura")
        socket.emit('config-temp-range', {min_temp: min_temp, max_temp: max_temp});

        if(sens == 'luz'){
            Notiflix.Report.Success(
                'Exito',
                `Se actualizo de forma correcta la luz minima a ${min_temp} lux y la luz maxima a ${max_temp} lux`,
                'Aceptar'
            );
        }else{
            Notiflix.Report.Success(
                'Exito',
                `Se actualizo de forma correcta la temperatura minima a ${min_temp} ºC y la temperatura maxima a ${max_temp} ºC`,
                'Aceptar'
            );
        }
        

    }

});

$('#alerta-tiempo-confirm').click(function(){   

    let tiempo_alerta = parseInt($("#alerta_tiempo_id").val());

    if(tiempo_alerta > 0){
        $("#alerta_tiempo_id").removeClass('is-invalid');
        $("#alerta_tiempo_id").addClass('is-valid');

        socket.emit('config-tiempo-alerta', {alerta_tiempo: tiempo_alerta});

        Notiflix.Report.Success(
            'Exito',
            `Se actualizo de forma correcta el tiempo entre alertas a: ${tiempo_alerta}`,
            'Aceptar'
        );

    }else{
        $("#alerta_tiempo_id").removeClass('is-valid');
        $("#alerta_tiempo_id").addClass('is-invalid');
        $("#alerta_tiempo_id").focus();
        Notiflix.Notify.Failure('Debe ingresar un tiempo valido');
    }
});


socket.on('config_update', function(data){
  
  for(let i in data.rows){

    if(data.rows[i].id == 1 && data.rows[i].sens == sens){
      $('#h-temp-min').text(data.rows[i].atr + ' ' + unidad);
    } else if(data.rows[i].id == 2 && data.rows[i].sens == sens){
      $('#h-temp-max').text(data.rows[i].atr + ' ' + unidad);
    } else if(data.rows[i].id == 3 && data.rows[i].sens == sens){
      $('#h-tiempo-muestreo').text(data.rows[i].atr + ' s');
    } else if(data.rows[i].id == 4 && data.rows[i].sens == sens){
      $('#h-email').text(data.rows[i].atr);
    } else if(data.rows[i].id == 5 && data.rows[i].sens == sens){
      $('#h-tiempo-alarma').text(data.rows[i].atr + ' m');
    }
  }
  
});

socket.on('update_temp_range', function (data){
  
  //Solo modifico si es mi sensor  
  if(data.sens != sens) return;

  $('#h-temp-min').text(data.min_temp + ' ' + unidad);
  $('#h-temp-max').text(data.max_temp + ' ' + unidad);

});

socket.on('update_tiempo_muestras', function (data){
  //Solo modifico si es mi sensor  
  if(data.sens != sens) return;
  $('#h-tiempo-muestreo').text(data.tiempo_muestras + ' s');
});

socket.on('update_email', function (data){
  //Solo modifico si es mi sensor  
  if(data.sens != sens) return;
  $('#h-email').text(data.email);
});

socket.on('update_tiempo_alerta', function (data){
  //Solo modifico si es mi sensor  
  if(data.sens != sens) return;
  $('#h-tiempo-alarma').text(data.tiempo_alerta + ' m');
});