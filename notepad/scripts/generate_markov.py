import requests

from notepad import db
from notepad.functions import generate
from notepad.models import Note

if __name__ == "__main__":
    text = generate()
    print(text)
    link_queue = Note.query.filter(Note.key == 'link queue').order_by(Note.id.desc()).first()
    links = list(filter(None, link_queue.text.split('\n')))
    link = links[0]
    if link:
        link_queue = link_queue.body.replace(link, '')
        db.commit()
        f = open('/root/notepad/access_token', 'r')
        access_token = f.read()
        r = requests.post('https://graph.facebook.com/10209368420464532/feed',
                          params={
                              'message': text,
                              "access_token": access_token,
                              "link": link.body.split(',')[0]
                              })
        print(r.status_code)
        print(r.text)
