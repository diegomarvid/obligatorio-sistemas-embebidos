#!/usr/bin/python3

import RPi.GPIO as GPIO
import statistics
import math
import socketio
import threading
import time
from time import sleep
import json

import datetime
from datetime import datetime


# Coneccion con el servidor
sio = socketio.Client()
sio.connect('http://192.168.0.111:8080')

#Nombre de usuario para conexion de datos con el servidor
#Verificar que no haya otro usuario conectado con el mismo nombre
user = 'piReal2'

#Variables de configuracion
TL = -1
TH = -1
tiempo_muestras = 5
email = ''
TA = -1
estado_alarma = 0

#Pines donde estan conectados los elementos
res = 17
cap = 27

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
def inicio_configuracion(data):

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
      config.append(i['atr'])
      cont = cont + 1
        
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
    TL = int(data['min_temp'])
    TH = int(data['max_temp'])
    print(TL)
    print(TH)
    return    

#Tiempo de muestreo
@sio.event
def update_tiempo_muestras(data):
    global tiempo_muestras
    tiempo_muestras = int(data['tiempo_muestras'])
    print(tiempo_muestras)
    return    

#Email de destino
@sio.event
def update_email(data):
    global email
    email = data['email']
    print(email)
    return

#Tiempo entre alertas
@sio.event
def update_tiempo_alerta(data):
    global TA
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


# Set up de los pines
GPIO.setmode(GPIO.BCM)
GPIO.setup(cap, GPIO.IN)
GPIO.setup(res, GPIO.OUT)

#Variables de hardware
# V_HIGH = 1.2173125233
V_HIGH = 1.227
C = 47.0 #uF
vcc = 3.25
tiempo_sleep = 4

#--------------------Metodos de ADC----------------------#

#Descarga del capacitor
#Se toma un tiempo mayor a 5 constantes de tiempo para
#la descarga del capacitor.
#Se usa un capacitor grande para aumentar la precision
def descarga(muestreo):
    GPIO.output(res, GPIO.LOW)
    sleep(muestreo)

#Medicion de tiempo de carga
def tiempo_carga():
    GPIO.output(res, GPIO.HIGH)
    contador = 0
    inicio = datetime.now()
    while not GPIO.input(cap):
        contador = contador + 1
    fin = datetime.now()    
    return (fin - inicio).total_seconds()

#Conversion de tiempo a resistencia equivalente
def obtener_r(th, c, vcc, vh):
    c = c / 1000
    c = c / 1000
    R = th / (c * (math.log(vcc) -math.log(vcc-vh)))
    return R

#Conversion de resistencia a temperatura del NTC
def obtener_temp(Rt):
    Ro = 10000.0
    To = 25.0 + 273.0
    B = 3977.0
    T_inv = math.log(Rt/Ro)/B + 1/To
    T_inv = T_inv
    return 1/T_inv - 273

#----------------------------------------------------------#
tiempo_ultima_medida = datetime.now()
#Loop general del sistema
while True:

    tiempo_actual = datetime.now()

    if  (tiempo_actual - tiempo_ultima_medida).total_seconds() >= tiempo_muestras:
        print((tiempo_actual - tiempo_ultima_medida).total_seconds())
        print(tiempo_muestras)
        descarga(tiempo_sleep)
        Rt = obtener_r(tiempo_carga(), C, vcc, V_HIGH)
        temp = obtener_temp(Rt)
        temp = round(temp)
        tiempo_ultima_medida = datetime.now()
        # print(temp)
        sio.emit('python', {'date': datetime.now().strftime("%Y-%m-%d %H:%M:%S"), 'temp': temp})

   
    




