

import smtplib
import time
from time import sleep


# Specifying the from and to addresses

fromaddr = 'tempsysrasp@gmail.com'
toaddrs  = 'valeotte@gmail.com'

# Writing the message (this message will appear in the email)

##msg = 'Sup bih'
subject = 'Alerta de temperatura.'
body = 'Man, alto problema, revisa esto papu'

msg = 'Subject: ' + subject +'\n\n'+ body
#msg = f'Subject: {subject}\n\n{body}'
# Gmail Login

username = 'tempsysrasp@gmail.com'
password = 'tempsys159357'

server = smtplib.SMTP('smtp.gmail.com:587')
server.starttls()
server.login(username,password)

ultima_alarma = time.time()

TH = 80
TL = 20
TA = 1

while True:

    temp = -30
    sleep(1)
    # segundo_tiempo = time.time()
    # print(segundo_tiempo - primer_tiempo)
    # primer_tiempo = time.time()

    print(time.time() - ultima_alarma)

    if temp > TH and (time.time() - ultima_alarma) > (TA*60):
        
        body = 'alerta por altas temperaturas!'
        msg = 'Subject: ' + subject +'\n\n'+body
        server.sendmail(fromaddr, toaddrs, msg)
        ultima_alarma = time.time()

    elif temp < TL and (time.time() - ultima_alarma) > (TA*60):

        body = 'Alerta por bajas temperaturas!'
        msg = 'Subject: ' + subject +'\n\n'+body
        server.sendmail(fromaddr, toaddrs, msg)
        ultima_alarma = time.time()



