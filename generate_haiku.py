import random, re
import os, sys

import requests

from notes.models import Word
from general.models import Tag, Content

def generate():
  line = 0
  syllable_count = 0
  syllable_limit = 5
  words = Word.objects.filter(prev__isnull=True).order_by('?')
  for word in words:
    if word.syllable_count == 5:
      line = 1
      syllable_limit = 7
    else:
      syllable_count = word.syllable_count
    response = verify_word(word, line, syllable_count, syllable_limit)
    if response:
      return word.text + response
  return None

def verify_word(word, line, syllable_count, syllable_limit):
  if line > 2:
    if word.next:
      return None
    else: 
      return word.text
  else:
    if not word.next:
        return None
  text = word.text

  words = Word.objects.filter(
    text__iexact = word.text,
    word_type = word.word_type,
    syllable_count__lte = syllable_limit - syllable_count,
    next__word_type = word.next.word_type).order_by('?')
  if words.first():
    for new_word in words:
      new_word = new_word.next
      new_line = line
      new_syllable_limit = syllable_limit
      new_syllable_count = syllable_count + new_word.syllable_count
      if new_word.syllable_count == 0:
        text = new_word.text
      elif syllable_count == 0:
        text = "\n" + new_word.text
      else:
        text = " " + new_word.text

      if new_syllable_count == new_syllable_limit:
        if line == 2 and new_word.next:
            return 

        if line == 0:
            new_syllable_limit = 7
        else:
            new_syllable_limit = 5
        new_line = line + 1
        new_syllable_count = 0

      result = verify_word(new_word, new_line, new_syllable_count, new_syllable_limit)
      if result:
        if result == new_word.text:
          return text
        else:
          return text + result
  else:
    return None


if __name__ == "__main__":
  text = Word.generate_haiku();
  print(text)
  post_tag = Tag.objects.get(title='post')
  used_tag = Tag.objects.get(title='used')
  note = Note.query.filter(key='post_queue').order_by(Note.id.desc()).first()
  link = Content.objects.filter(tags=post_tag).exclude(tags=used_tag).order_by('?').first()
  if link:
    link.tags.add(used_tag)
    link.save()
    f = open('/srv/nobelyoo/notes/access_token', 'rw')
    access_token = f.read()
    r = requests.post('https://graph.facebook.com/10209368420464532/feed', params={'message': text, "access_token": access_token, "link": link.body.split(',')[0]})
    print r.status_code
    print r.text
