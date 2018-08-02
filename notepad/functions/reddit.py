import logging
import re
from html.parser import HTMLParser

import spacy
import requests

from notepad import settings

logger = logging.getLogger(__name__)
nlp = spacy.load('en')
h = HTMLParser()

# pylint: disable=too-many-branches,too-many-statements
def get_reddit_post():
    client_id = settings.REDDIT_CLIENT_ID
    client_secret = settings.REDDIT_CLIENT_SECRET
    client_auth = requests.auth.HTTPBasicAuth(client_id, client_secret)
    post_data = {'grant_type': 'client_credentials'}
    headers = {"User-Agent": 'MultiBotReader/0.1 by fizzy123'}
    response = requests.post("https://www.reddit.com/api/v1/access_token",
                             auth=client_auth,
                             data=post_data,
                             headers=headers)
    authorization = response.json()

    headers = {
        "Authorization": "bearer {0}".format(authorization['access_token']),
        "User-Agent": 'MultiBotReader/0.1 by fizzy123'
    }
    response = requests.get('https://oauth.reddit.com/user/fizzy123/m/bot.json', headers=headers)
    data = response.json()
    listings = data['data']['children']
    link = ''
    text = ''
    valid = []
    for listing in listings:
        if re.search('reddit', listing['data']['title'], re.IGNORECASE):
            continue
        if re.search('redit', listing['data']['title'], re.IGNORECASE):
            continue
        if re.search('karma', listing['data']['title'], re.IGNORECASE):
            continue
        if re.search('/r/', listing['data']['title'], re.IGNORECASE):
            continue
        if re.search('AMA', listing['data']['title']):
            continue
        if re.search('I ', listing['data']['title']):
            continue
        if re.search('---', listing['data']['title']):
            continue
        if listing['data']['is_self']:
            valid.append({'link': '', 'text': listing['data']['title'].strip()})
        elif listing['data']['subreddit'] == 'todayilearned':
            valid.append({'link': '', 'text': listing['data']['title'].strip()})
        else:
            url = 'https://oauth.reddit.com/comments/{}.json?sort=top'.format(listing['data']['id'])
            response = requests.get(url, headers=headers)
            if response.json()[1]['data']['children']:
                comment = response.json()[1]['data']['children'][0]['data']
                if comment['stickied']:
                    continue
                if float(comment['ups'])/float(listing['data']['ups']) < 0.2:
                    continue
                if re.search('edit', comment['body'], re.IGNORECASE):
                    continue
                if re.search('reddit', comment['body'], re.IGNORECASE):
                    continue
                if re.search('/r/', comment['body'], re.IGNORECASE):
                    continue
                if re.search('username', comment['body'], re.IGNORECASE):
                    continue
                if re.search('OP', comment['body']):
                    continue

                listing['data']['url'] = listing['data']['url'].replace('&amp;', '&')
                if listing['data']['url'] and re.search(r"\.gif(v*)$",
                                                        listing['data']['url'],
                                                        re.IGNORECASE):
                    link = re.sub(r"\.gif(v*)$", '', listing['data']['url'], flags=re.IGNORECASE)
                    text = comment['body']
                    valid.append({'link': link, 'text': h.unescape(text.strip())})
                    continue
                valid.append({"link": listing['data']['url'], 'text': h.unescape(comment['body'])})
    return valid
