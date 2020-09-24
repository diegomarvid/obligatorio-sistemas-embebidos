#!/usr/bin/python3

import RPi.GPIO as GPIO
import statistics
import math
import socketio
import threading

import time
from time import sleep

import datetime
from datetime import datetime

sio = socketio.Client()
sio.connect('http://192.168.0.111:8080')

user = 'piReal'

sio.emit('data_connection', {'id': user})

@sio.event
def data_connection_res(data):
    if(data['success'] == True): 
        print('connected to serverrr')
    else:
        print('connection refused by server')    
    return

res = 17
cap = 27

print(math.log(2))

#GPIO.setwarnings(False)

GPIO.setmode(GPIO.BCM)
GPIO.setup(cap, GPIO.IN)
GPIO.setup(res, GPIO.OUT)

V_HIGH = 1.2173125233
V_HIGH = 1.227
C = 47.0 #uF
vcc = 3.25


def descarga():
    GPIO.output(res, GPIO.LOW)
    sleep(5)

def tiempo_carga():
    GPIO.output(res, GPIO.HIGH)
    contador = 0
    inicio = datetime.now()
    while not GPIO.input(cap):
        contador = contador + 1
    fin = datetime.now()    
    return (fin - inicio).total_seconds()

def obtener_r(th, c, vcc, vh):
    c = c / 1000
    c = c / 1000
    R = th / (c * (math.log(vcc) -math.log(vcc-vh)))
    return R

def obtener_temp(Rt):
    Ro = 10000.0
    To = 25.0 + 273.0
    B = 3977.0
    T_inv = math.log(Rt/Ro)/B + 1/To
    T_inv = T_inv
    return 1/T_inv - 273
tiempos = []

# descarga()
# print(tiempo_carga().total_seconds())


# def loop():
#     threading.Timer(5.0, loop).start()
#     descarga()
#     x = tiempo_carga()
#     print(x)
    # sio.emit('python', {'date': datetime.now().strftime("%Y-%m-%d %H:%M:%S"), 'temp': 64})

while True:
    descarga()
    Rt = obtener_r(tiempo_carga(), C, vcc, V_HIGH)
    temp = obtener_temp(Rt)
    print(temp)
    sio.emit('python', {'date': datetime.now().strftime("%Y-%m-%d %H:%M:%S"), 'temp': temp})


   

# for i in range(1):
#     descarga()
#     x = tiempo_carga()
#     print(x)
#     tiempos.append(x)

# print("--------------------")

# mean = statistics.mean(tiempos)
# Rt = obtener_r(mean, C, vcc, V_HIGH)
# print(Rt)
# print(obtener_temp(Rt))
# var = statistics.variance(tiempos)
# print("Media: {:f}", mean)
# print("Varianza: {:f}", var)
# print(time())