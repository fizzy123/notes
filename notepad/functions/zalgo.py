# coding: utf-8
from random import randint, choice

def zalgo(text):
    zalgo_chars = [chr(i) for i in range(0x0300, 0x036F + 1)]
    zalgo_chars.extend([u'\u0488', u'\u0489'])
    source = text.upper()
    if not _is_narrow_build():
        source = _insert_randoms(source)
    zalgoized = []
    for letter in source:
        zalgoized.append(letter)
    response = choice(zalgo_chars).join(source)
    return response.encode('utf8', 'ignore')


def _insert_randoms(text):
    random_extras = [chr(i) for i in range(0x1D023, 0x1D045 + 1)]
    newtext = []
    for char in text:
        newtext.append(char)
        if randint(1, 5) == 1:
            newtext.append(choice(random_extras))
    return u''.join(newtext)


def _is_narrow_build():
    try:
        chr(0x10000)
    except ValueError:
        return True
    return False
