//Variable de socket
let socket = io();

socket.emit('ip_client', {ip: ip});

//Obtener datos del form de login
function login(){
    let username = $('#username_id').val();
    let password = $('#password_id').val();
    socket.emit('logIn', {username: username, password: password});
    return;
}