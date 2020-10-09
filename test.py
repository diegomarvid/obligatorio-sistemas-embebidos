# -*- coding: utf-8 -*

import RPi.GPIO as GPIO
import statistics
import math
import socketio
import smtplib
import time
from time import sleep


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

#Rangos limites

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
      config.append(i['atr'])
      cont = cont + 1

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

#Evento de re conexion con el servidor
@sio.event
def connect():
    print('Se volvio a conectar al servidor')


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
    inicio = datetime.now()
    while (not GPIO.input(cap)) and ((datetime.now() - inicio).total_seconds() < tiempo_muestras):
        pass    
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

def muestrear():
    descarga(tiempo_sleep)
    Rt = obtener_r(tiempo_carga(), C, vcc, V_HIGH)
    temp = obtener_temp(Rt)
    return round(temp)

#----------------------------------------------------------#
tiempo_ultima_medida = datetime.now()
tiempo_ultima_alarma = datetime.now()


#Loop general del sistema
temp = 0

server = init_smtp()

while True:

    tiempo_actual = datetime.now()

    if  (tiempo_actual - tiempo_ultima_medida).total_seconds() >= tiempo_muestras:
        temp = muestrear()
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
                    send_mail(server, email, 'ALERTA temperatura alta', "La temperatura paso el limite {0} ºC con un valor de {1} ºC".format(TH, temp))
                    print("La temperatura paso el limite {0} ºC con un valor de {1} ºC".format(TH, temp))
                    tiempo_ultima_alarma = datetime.now()
                if temp <= TL:
                    send_mail(server, email, 'ALERTA temperatura baja', "La temperatura paso el limite {0} ºC con un valor de {1} ºC".format(TL, temp))
                    print("La temperatura paso el limite {0} ºC con un valor de {1} ºC".format(TL, temp))
                    tiempo_ultima_alarma = datetime.now() 

   
    




