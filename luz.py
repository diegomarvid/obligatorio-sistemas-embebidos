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
# sio.connect('http://192.168.0.107:8080')
sio.connect('https://iandel.net')

#Nombre de usuario para conexion de datos con el servidor
#Verificar que no haya otro usuario conectado con el mismo nombre
sens = 'luz'
user = 'pi-Diego'
user = '{0}_{1}'.format(user, sens)


#Variables de configuracion
TL = -1
TH = -1
tiempo_muestras = 5
email = ''
TA = -1
estado_led = 0
estado_alarma = 0

#Pines donde estan conectados los elementos
res = 17
cap = 27
led = 25

#Rangos limites

#Temperatura que da si se pone en tierra
TEMP_GND = -1
#Temperatura que da si se saca el NTC
TEMP_NAN = 20000

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
    global estado_led
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
    estado_led = config[5].lower()
    estado_alarma = config[6].lower()
    
    if estado_led == 'true':
      GPIO.output(led, GPIO.HIGH) 
    else:
      GPIO.output(led, GPIO.LOW)

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

#Estado de LED
@sio.event
def update_estado_led(data):
    global estado_led
    estado_led = data['estado_led']
    print(estado_led)
    if estado_led == True:
        GPIO.output(led, GPIO.HIGH)       
    else:
        GPIO.output(led, GPIO.LOW)      
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
GPIO.setup(led, GPIO.OUT)
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

    #Se descargue por el terminal del capacitor
    #Impedancia de entrada infinita en la NTC
    GPIO.setup(cap, GPIO.OUT)
    GPIO.setup(res, GPIO.IN)

    GPIO.output(cap, GPIO.LOW)
    sleep(muestreo)

#Medicion de tiempo de carga
def tiempo_carga():

    GPIO.setup(cap, GPIO.IN)
    GPIO.setup(res, GPIO.OUT)

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

#Conversion de resistencia a lux
def obtener_luz(Rt):
    Ro = 1.25*(10**7)
    alfa = -1.4059
    return Ro * (Rt ** alfa)

def muestrear():
    descarga(tiempo_sleep)
    Rt = obtener_r(tiempo_carga(), C, vcc, V_HIGH)
    luz = obtener_luz(Rt)
    return round(luz)

#----------------------------------------------------------#
tiempo_ultima_medida = datetime.now()
tiempo_ultima_alarma = datetime.now()


#Loop general del sistema
luz = 0

server = init_smtp()

while True:
    
    tiempo_actual = datetime.now()

    if  (tiempo_actual - tiempo_ultima_medida).total_seconds() >= tiempo_muestras:
        luz = muestrear()
        print(luz)
        tiempo_ultima_medida = datetime.now()
        if (luz > TEMP_GND) and (luz < TEMP_NAN):
            sio.emit('python', {'date': datetime.now().strftime("%Y-%m-%d %H:%M:%S"), 'temp': luz})
        else:
            print("Se pudo haber desconectado el LDR o puesto a tierra")    

    if estado_alarma == True:

        if (luz > TEMP_GND) and (luz < TEMP_NAN):

            if (tiempo_actual - tiempo_ultima_alarma).total_seconds() >= (TA)*60:
                if luz >= TH:
                    send_mail(server, email, 'ALERTA luz alta', "La luz paso el limite {0} lux con un valor de {1} lux".format(TH, luz))
                    print("La luz paso el limite {0} lux con un valor de {1} lux".format(TH, luz))
                    tiempo_ultima_alarma = datetime.now()
                if luz <= TL:
                    send_mail(server, email, 'ALERTA luz baja', "La luz paso el limite {0} lux con un valor de {1} lux".format(TL, luz))
                    print("La luz paso el limite {0} lux con un valor de {1} lux".format(TL, luz))
                    tiempo_ultima_alarma = datetime.now() 

             

   
    




