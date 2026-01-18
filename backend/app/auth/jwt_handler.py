"""
JWT Token 处理
提供 JWT token 生成、验证和解码功能
"""

from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from jose import JWTError, jwt
from app.config import settings


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """
    创建访问令牌

    参数:
        data: 要编码到 token 中的数据
        expires_delta: 过期时间增量，默认使用配置中的时间

    返回:
        JWT token 字符串
    """
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)

    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow()
    })

    encoded_jwt = jwt.encode(
        to_encode,
        settings.secret_key,
        algorithm=settings.algorithm
    )

    return encoded_jwt


def verify_token(token: str) -> bool:
    """
    验证 token 是否有效

    参数:
        token: JWT token 字符串

    返回:
        token 是否有效
    """
    try:
        jwt.decode(
            token,
            settings.secret_key,
            algorithms=[settings.algorithm]
        )
        return True
    except JWTError:
        return False


def decode_token(token: str) -> Optional[Dict[str, Any]]:
    """
    解码 token

    参数:
        token: JWT token 字符串

    返回:
        解码后的数据，如果 token 无效则返回 None
    """
    try:
        payload = jwt.decode(
            token,
            settings.secret_key,
            algorithms=[settings.algorithm]
        )
        return payload
    except JWTError:
        return None
