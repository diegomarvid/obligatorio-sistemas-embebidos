import sqlite3
import datetime
import threading
import random
import socketio
import json
from json import dumps


from sqlite3 import Error

from datetime import datetime

try:

    con = sqlite3.connect('./db/temp.db', check_same_thread=False)

    print("Connection is established")

except Error:

    print(Error)



sio = socketio.Client()    
sio.connect('https://obligatorio1-embebidos.herokuapp.com/')

user = 'piotte'

sio.emit('data_connection', {'id': user})

@sio.event
def config_update(data):
    # print(data)
    return

@sio.event
def data_connection_res(data):
    if(data['success'] == True): 
        print('connected to serverrr')
    else:
        print('connection refused by server')    
    return    

def sql_table(con):

    cursorObj = con.cursor()

    cursorObj.execute("CREATE TABLE test(date text PRIMARY KEY, temperature integer)")

    con.commit()


def sql_fetch(con):

    cursorObj = con.cursor()

    cursorObj.execute('SELECT * FROM test WHERE date BETWEEN ? AND ?', ['2020-09-11 19:42:00', '2020-09-11 19:50:00'])

    rows = cursorObj.fetchall()

    for row in rows:

        print(row)

def sql_insert(con,values):
    cursorObj = con.cursor()
    cursorObj.execute("INSERT INTO test values (?,?)", values)
    con.commit()   

def sql_update(con,temp):
    cursorObj = con.cursor()
    cursorObj.execute("REPLACE INTO test values (?,?)", [datetime.now(), temp])
    con.commit()       

def sql_fetch_last(con):

    cursorObj = con.cursor()

    cursorObj.execute('SELECT * FROM test ORDER BY date DESC LIMIT 1')

    rows = cursorObj.fetchall()

    print(rows[0])

# json.dumps(my_dictionary, indent=4, sort_keys=True, default=str)

# tempii = 50

def loop():
  threading.Timer(5.0, loop).start()
  sio.emit('python', {'date': datetime.now().strftime("%Y-%m-%d %H:%M:%S"), 'temp': 50})
#   sql_update(con, random.randint(20,70))
  

loop()