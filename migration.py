import redis
from notepad.models import Note
from notepad import db
r = redis.StrictRedis(host='localhost', port=6379, db=0)

keys = r.keys('ram:page:*')

for key in keys:
    print(key)
    body = r.get(key)
    item = Note(key=str(key, 'utf-8')[9:], body=str(body, 'utf-8'))
    db.session.add(item)
db.session.commit()
