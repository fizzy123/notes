import re

import tweepy
import enchant
from nltk.corpus import stopwords

from notepad.functions.twitter import get_api

custom_stopwords = [
    '\n',
    'like',
    'really',
    'cant',
    'cause',
    'this',
    'wanna',
    "i",
    "im",
    "my",
    "i'm",
    "people",
    "if",
    "someone"
    "when",
    "anyone",
    "its",
    "we",
    "when",
    "get",
    "please",
    "so",
    "good",
    "time",
    "back",
    "fuck"
    "got",
    "life",
    "never",
    "one",
    "love",
    "today",
    "someone",
    "go",
    ".",
    "f",
    ".",
    "day",
    "everything",
    "oh",
    "everyone",
    "fuck",
    "ass",
    "god",
    "make",
    "gonna",
    "years",
    "days",
    "got",
    "wait",
    "damn",
    "shit",
    "things",
    "better",
    "something",
    "thing",
    "theres",
    "gotta",
    "me",
    "hes",
    "would",
    "else",
    "u",
    "theyve",
    "theyre",
    "already",
    "yet",
    "yo",
    "id",
    "give"
]

word_count = {}
stopWords = {word: True for word in stopwords.words('english') + custom_stopwords}
d = enchant.Dict("en_US")
class StreamListener(tweepy.StreamListener):
    def on_status(self, status):
        status.text = status.text.lower().encode("ascii", errors="ignore").decode()
        if status.text[0:2] != "RT" and \
           "#" not in status.text and \
           "@" not in status.text and \
           "https://t.co" not in status.text:
            words = status.text.split(' ')
            words = [x for x in words if x.strip()]
            if words[0] not in stopWords and d.check(words[0]):
                count(words[0])
            for i in range(0, len(words) - 1):
                if words[i] not in stopWords and \
                   words[i+1] not in stopWords and \
                   d.check(words[i]) and \
                   d.check(words[i+1]):
                    print(re.sub(r"[?!\"',;.]", "", words[i] + " " + words[i+1]))
                    count(words[i+1])
#                    print(sorted(word_count.items(), key=operator.itemgetter(1), reverse=True))
#                    print("\n")

    def on_error(self, status_code):
        if status_code == 420:
            return False

def count(word):
    if word in word_count:
        word_count[word] = word_count[word] + 1
    else:
        word_count[word] = 1

api = get_api()
stream = tweepy.Stream(api.auth, listener=StreamListener())
stream.sample(languages=["en"])
