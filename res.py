import RPi.GPIO as GPIO
import statistics
import math
import time
from time import sleep


import datetime
from datetime import datetime

#Pines donde estan conectados los elementos
res = 17
cap = 27

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
    while (not GPIO.input(cap)) and ((datetime.now() - inicio).total_seconds() < 20):
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
def obtener_luz(Rt):
    Ro = 1.25*(10**7)
    alfa = -1.1 
    return Ro * (Rt ** alfa)

while True:

    time.sleep(1)
    descarga(tiempo_sleep)
    t = tiempo_carga()
    Rt = obtener_r(t, C, vcc, V_HIGH)
    lux = obtener_luz(Rt)
    print("La luz es: {0} lux | La resistencia es: {1} ohm".format(lux, Rt))