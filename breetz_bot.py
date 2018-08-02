import random
import re
import json
import sys
from urllib.parse import urlencode, quote_plus

import oauth2 as oauth

from notepad import settings

def breetz_oauth_req(url, http_method="GET", post_body='', http_headers=''):
    key = settings.BREETZ_CONSUMER_KEY
    secret = settings.BREETZ_CONSUMER_SECRET
    consumer = oauth.Consumer(key=key, secret=secret)
    key = settings.BREETZ_TOKEN_KEY
    secret = settings.BREETZ_TOKEN_SECRET
    token = oauth.Token(key=key, secret=secret)
    client = oauth.Client(consumer, token)
    return client.request(url, method=http_method, body=post_body.encode('utf-8'), headers=http_headers)[1]

def breetz_bot():
    text = []
    max_id = 0
#pylint: disable=line-too-long
    home_timeline = breetz_oauth_req('https://api.twitter.com/1.1/statuses/user_timeline.json?screen_name=BreetzTweetz&count=200&exclude_replies=true')
    home_timeline = json.loads(str(home_timeline, 'utf-8'))
    print(home_timeline)
    while home_timeline:
        for tweet in home_timeline:
            if not re.search(r'https?:\/\/.*[\r\n]*', tweet['text']):
                tweet['text'] = re.sub(r'RT ', '', tweet['text'], flags=re.MULTILINE)
                tweet['text'] = re.sub(r'@(\S)* ', '', tweet['text'], flags=re.MULTILINE)
                text = text + tweet['text'].split(' ') + ['###']
        max_id = str(home_timeline[-1]['id'] - 1)
#pylint: disable=line-too-long
        home_timeline = breetz_oauth_req('https://api.twitter.com/1.1/statuses/user_timeline.json?screen_name=BreetzTweetz&count=200&exclude_replies=true&max_id=' + max_id)
        home_timeline = json.loads(str(home_timeline, 'utf-8'))
    f = open('/root/breetz.txt', 'w')
    f.write(re.sub(r'[^\x00-\x7F]+', ' ', ' '.join(text)))
    f.close()

def breetz_tweets():
    f = open('/root/breetz.txt', 'r')
    tweets = f.read()
    tweets = tweets.split(' ')
    indexes = [i for i, x in enumerate(tweets) if x == '###']
    word = tweets[random.choice(indexes) + 1]
    quote = word
    indexes = [i for i, x in enumerate(tweets) if x == word]
    word = tweets[random.choice(indexes) + 1]

    while word != '###':
        quote = quote + ' ' + word
        indexes = [i for i, x in enumerate(tweets) if x == word]
        word = tweets[random.choice(indexes) + 1]
    #print quote
#pylint: disable=line-too-long
    print(breetz_oauth_req('https://api.twitter.com/1.1/statuses/update.json', "POST", urlencode({'status':quote}, quote_via=quote_plus)))

if __name__ == "__main__":
    if sys.argv[1] == "collect":
        breetz_bot()
    elif sys.argv[1] == "tweet":
        breetz_tweets()
