from notepad.functions.twitter import tweet
from notepad.models import Word

print(tweet(Word.generate_text()))
