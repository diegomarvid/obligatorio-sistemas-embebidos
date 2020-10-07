import smtplib
# Specifying the from and to addresses

fromaddr = 'tubiega@gmail.com'
toaddrs  = 'diegomarvid99@gmail.com'

# Writing the message (this message will appear in the email)

##msg = 'Sup bih'
subject = 'Resultado de evaluacion.'
body = 'Hola trolita'

msg = f'Subject: {subject}\n\n{body}'
# Gmail Login

username = 'tempsysrasp@gmail.com'
password = 'tempsys159357'

# Sending the mail  

server = smtplib.SMTP('smtp.gmail.com:587')
server.starttls()
server.login(username,password)
server.sendmail(fromaddr, toaddrs, msg)
server.quit()