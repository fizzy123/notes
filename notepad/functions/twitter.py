import tweepy

from notepad import settings

def get_api():
    auth = tweepy.OAuthHandler(settings.TWITTER_CONSUMER_KEY,
                               settings.TWITTER_CONSUMER_SECRET)
    auth.set_access_token(settings.TWITTER_TOKEN_KEY,
                          settings.TWITTER_TOKEN_SECRET)
    return tweepy.API(auth)

def tweet(text):
    api = get_api()
    return api.update_status(text)

class StreamListener(tweepy.StreamListener):
    def on_status(self, status):
        print(status.text)

    def on_error(self, status_code):
        if status_code == 420:
            return False
