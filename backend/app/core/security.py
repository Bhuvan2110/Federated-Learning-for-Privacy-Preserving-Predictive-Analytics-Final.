from datetime import datetime, timedelta, timezone
from typing import Any, Optional, Union
from passlib.context import CryptContext
import jwt
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.backends import default_backend
import os

# rounds=4 (bcrypt minimum) gives ~3-5ms hash time → total login round-trip ≈20-25ms.
# Increase to 10-12 for production deployments that can tolerate ~100-500ms.
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=4)

ALGORITHM = "RS256"

def _load_or_create_rsa_key():
    """
    Load the RSA private key from the database (via env var JWT_PRIVATE_KEY),
    or from /tmp/ as a fallback, or generate a new one.
    Storing the key in an env var / DB means it survives Render redeploys
    so existing tokens remain valid.
    """
    # 1. Try env var (set this in Render dashboard once, never changes)
    key_pem_env = os.getenv("JWT_PRIVATE_KEY", "")
    if key_pem_env:
        try:
            key_pem = key_pem_env.replace("\\n", "\n").encode()
            return serialization.load_pem_private_key(
                key_pem, password=None, backend=default_backend()
            )
        except Exception:
            pass

    # 2. Try disk cache (/tmp — works within a single deployment lifetime)
    KEY_PATH = "/tmp/jwt_private.pem"
    if os.path.exists(KEY_PATH):
        try:
            with open(KEY_PATH, "rb") as key_file:
                return serialization.load_pem_private_key(
                    key_file.read(), password=None, backend=default_backend()
                )
        except Exception:
            pass

    # 3. Generate new key (only happens on first-ever startup)
    key = rsa.generate_private_key(
        public_exponent=65537, key_size=2048, backend=default_backend()
    )
    try:
        pem = key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption(),
        )
        with open(KEY_PATH, "wb") as key_file:
            key_file.write(pem)
        print("NEW RSA key generated. Copy the value below into Render env var JWT_PRIVATE_KEY:")
        print(pem.decode())
    except Exception:
        pass
    return key


private_key = _load_or_create_rsa_key()
public_key = private_key.public_key()

private_pem = private_key.private_bytes(
    encoding=serialization.Encoding.PEM,
    format=serialization.PrivateFormat.PKCS8,
    encryption_algorithm=serialization.NoEncryption()
)

public_pem = public_key.public_bytes(
    encoding=serialization.Encoding.PEM,
    format=serialization.PublicFormat.SubjectPublicKeyInfo
)

def create_access_token(subject: Union[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        # 7-day expiry — users stay logged in without being kicked out
        expire = datetime.now(timezone.utc) + timedelta(days=7)
    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(to_encode, private_pem, algorithm=ALGORITHM)
    return encoded_jwt


def create_refresh_token(subject: Union[str, Any]) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=7)
    to_encode = {"exp": expire, "sub": str(subject), "type": "refresh"}
    encoded_jwt = jwt.encode(to_encode, private_pem, algorithm=ALGORITHM)
    return encoded_jwt

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def aes_encrypt(data: bytes, key: bytes) -> tuple:
    iv = os.urandom(12)
    cipher = Cipher(algorithms.AES(key), modes.GCM(iv), backend=default_backend())
    encryptor = cipher.encryptor()
    ciphertext = encryptor.update(data) + encryptor.finalize()
    return iv, ciphertext, encryptor.tag

def aes_decrypt(iv: bytes, ciphertext: bytes, tag: bytes, key: bytes) -> bytes:
    cipher = Cipher(algorithms.AES(key), modes.GCM(iv, tag), backend=default_backend())
    decryptor = cipher.decryptor()
    return decryptor.update(ciphertext) + decryptor.finalize()
