# -*- coding: utf-8 -*

import RPi.GPIO as GPIO
import statistics
import math
import socketio
import smtplib
import time
from time import sleep
import time
from w1thermsensor import W1ThermSensor
sensor = W1ThermSensor()

import datetime
from datetime import datetime

#-----Funcion para inicializar servidor smtp--------#
def init_smtp():

    username = 'tempsysrasp@gmail.com'
    password = 'tempsys159357'

    server = smtplib.SMTP('smtp.gmail.com:587')
    server.starttls()
    server.login(username,password)

    return server

def send_mail(server, destiny, subject, body):

    fromaddr = 'tempsysrasp@gmail.com'  
    msg = 'Subject: ' + subject +'\n\n'+ body
    server.sendmail(fromaddr, destiny, msg)


# Coneccion con el servidor
sio = socketio.Client()
# sio.connect('http://192.168.0.104:8080')
sio.connect('https://iandel.net')

#Nombre de usuario para conexion de datos con el servidor
#Verificar que no haya otro usuario conectado con el mismo nombre
sens = 'digital'
user = 'pi-Otte'
user = '{0}_{1}'.format(user, sens)


#Variables de configuracion
TL = -1
TH = -1
tiempo_muestras = 5
email = ''
TA = -1
estado_alarma = 0



#Temperatura que da si se pone en tierra
TEMP_GND = -10
#Temperatura que da si se saca el NTC
TEMP_NAN = 150

#Establecer conexion de datos con el servidor
sio.emit('data_connection', {'id': user})


#Evento de conexion
@sio.event
def data_connection_res(data):
    if(data['success'] == True): 
        print('Conexion exitosa con el servidor')
    else:
        print('Conexion rechazada por el servidor')    
    return

@sio.event
def config_update(data):

    global TL
    global TH
    global tiempo_muestras
    global email
    global TA
    global estado_alarma

    cont = 0
    
    config = []
   
    
    rows = data['rows']
    for i in rows:
        if i['sens'] == sens:
            config.append(i['atr'])
            cont = cont + 1
        if i['sens'] == None:
            config.append(i['atr'])

    print(config)  
        
    TL = int(config[0])
    TH = int(config[1])
    tiempo_muestras = int(config[2])
    email = config[3]
    TA = int(config[4])
    estado_alarma = config[5].lower()
    
    if estado_alarma == 'true':
      estado_alarma = True
    else:
      estado_alarma = False  
      



#-----------Eventos de configuracion-------------------#

#Rangos de temperatura
@sio.event
def update_temp_range(data):
    global TL
    global TH
    if data['sens'] == sens:
        TL = int(data['min_temp'])
        TH = int(data['max_temp'])
        print(TL)
        print(TH)
    return    

#Tiempo de muestreo
@sio.event
def update_tiempo_muestras(data):
    global tiempo_muestras
    if data['sens'] == sens:
        tiempo_muestras = int(data['tiempo_muestras'])
        print(tiempo_muestras)
    return    

#Email de destino
@sio.event
def update_email(data):
    global email
    if data['sens'] == sens:
        email = data['email']
        print(email)
    return

#Tiempo entre alertas
@sio.event
def update_tiempo_alerta(data):
    global TA
    if data['sens'] == sens:
        TA = int(data['tiempo_alerta'])
        print(TA)
    return

#Estado de alarma
@sio.event
def update_estado_alarma(data):
    global estado_alarma
    estado_alarma = data['estado_alarma']
    print(estado_alarma)
    return

#---------------------------------------------------#      

#Evento de desconexion del servidor
@sio.event
def disconnect():
    print('Se perdio la conexion con el servidor')

#Evento de re conexion con el servidor
@sio.event
def connect():
    print('Se volvio a conectar al servidor')






#----------------------------------------------------------#
tiempo_ultima_medida = datetime.now()
tiempo_ultima_alarma = datetime.now()


#Loop general del sistema
temp = 0

server = init_smtp()

while True:

    tiempo_actual = datetime.now()

    if  (tiempo_actual - tiempo_ultima_medida).total_seconds() >= tiempo_muestras:
        temp = round(sensor.get_temperature())
        print(temp)
        tiempo_ultima_medida = datetime.now()
        if (temp > TEMP_GND) and (temp < TEMP_NAN):
            sio.emit('python', {'date': datetime.now().strftime("%Y-%m-%d %H:%M:%S"), 'temp': temp})
        else:
            print("Se pudo haber desconectado el NTC o puesto a tierra")    

    if estado_alarma == True:

        if (temp > TEMP_GND) and (temp < TEMP_NAN):

            if (tiempo_actual - tiempo_ultima_alarma).total_seconds() >= (TA)*60:
                if temp >= TH:
                    send_mail(server, email, 'ALERTA temperatura alta digital', "La temperatura paso el limite {0} ÂºC con un valor de {1} ÂºC".format(TH, temp))
                    print("La temperatura paso el limite {0} ÂºC con un valor de {1} ÂºC".format(TH, temp))
                    tiempo_ultima_alarma = datetime.now()
                if temp <= TL:
                    send_mail(server, email, 'ALERTA temperatura baja digital', "La temperatura paso el limite {0} ÂºC con un valor de {1} ÂºC".format(TL, temp))
                    print("La temperatura paso el limite {0} ÂºC con un valor de {1} ÂºC".format(TL, temp))
                    tiempo_ultima_alarma = datetime.now() 
