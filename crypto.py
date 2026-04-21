import base64
import hashlib
from cryptography.fernet import Fernet, InvalidToken

_PASSPHRASE = "nhn!@#123"
_KEY = base64.urlsafe_b64encode(hashlib.sha256(_PASSPHRASE.encode()).digest())
_fernet = Fernet(_KEY)


def encrypt(plaintext: str) -> str:
    if not plaintext:
        return plaintext
    return _fernet.encrypt(plaintext.encode("utf-8")).decode("ascii")


def decrypt(ciphertext: str) -> str:
    if not ciphertext:
        return ciphertext
    try:
        return _fernet.decrypt(ciphertext.encode("ascii")).decode("utf-8")
    except (InvalidToken, Exception):
        return ciphertext
