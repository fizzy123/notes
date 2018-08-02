import random
import sys

import requests
from notepad.functions.reddit import get_reddit_post
from notepad.models import Note, Word

if __name__ == "__main__":
    if random.random() < 0.9:
        post = Word.generate_text()
        print(post)
        link_note = Note.query.filter(Note.key == 'link queue').order_by(Note.id.desc()).first()
        links = list(filter(None, link_note.body.split('\n')))
        post_note = Note.query.filter(Note.key == 'post queue').order_by(Note.id.desc()).first()
        posts = list(filter(None, post_note.body.split('\n')))
        if links:
            link = random.choice(links)
            # remove link from link queue
            Note.write('link queue', link_note.body.replace(link, ''))
        else:
            sys.exit(1)

        if posts and random.random() < 0.1:
            post = random.choice(posts)
            # remove post from post queue
            Note.write('post queue', post_note.body.replace(post, ''))

            corpus = Note.query.filter(Note.key == 'corpus').order_by(Note.id.desc()).first()
            Note.write('corpus', corpus.body + '\n\n' + post)
        text = post

    else:
        posts = get_reddit_post
        post = random.choice(posts)
        text = post['text']
        link = post['link']
    f = open('/root/notepad/access_token', 'r')
    access_token = f.read()
#pylint: disable=line-too-long
    r = requests.post('https://graph.facebook.com/10209368420464532/feed', params={'message': text, 'access_token': access_token, "link": link})
    print(r.status_code)
    print(r.text)
