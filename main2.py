import datetime
import threading
import random
import socketio

from sqlite3 import Error

from datetime import datetime

sio = socketio.Client()    
sio.connect('http://localhost:8080')

user = 'pi12'

sio.emit('data_connection', {'id': user})

@sio.event
def data_connection_res(data):
    if(data['success'] == True): 
        print('connected to serverrr')
    else:
        print('connection refused by server')    
    return

def loop():
    threading.Timer(5.0, loop).start()
    sio.emit('python', {'date': datetime.now().strftime("%Y-%m-%d %H:%M:%S"), 'temp': 50})


loop()    