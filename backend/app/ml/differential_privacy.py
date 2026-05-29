import math
import random
from typing import List, Tuple

def clip_gradients(dw: List[float], db: float, max_norm: float) -> Tuple[List[float], float]:
    """
    Clips gradients to ensure their L2 norm does not exceed max_norm.
    """
    norm_sq = sum(w ** 2 for w in dw) + db ** 2
    norm = math.sqrt(norm_sq)
    
    if norm > max_norm:
        scale = max_norm / norm
        dw_clipped = [w * scale for w in dw]
        db_clipped = db * scale
        return dw_clipped, db_clipped
    return dw, db

def generate_gaussian_noise(std_dev: float) -> float:
    """
    Generates Gaussian noise from scratch using Box-Muller transform.
    """
    u1 = random.random()
    u2 = random.random()
    u1 = max(u1, 1e-15)
    z0 = math.sqrt(-2.0 * math.log(u1)) * math.cos(2.0 * math.pi * u2)
    return z0 * std_dev

def dp_sgd_step(dw: List[float], db: float, noise_multiplier: float, max_norm: float, batch_size: int) -> Tuple[List[float], float]:
    """
    Applies gradient clipping and adds Gaussian noise for DP-SGD.
    """
    dw_clipped, db_clipped = clip_gradients(dw, db, max_norm)
    
    std_dev = (noise_multiplier * max_norm) / batch_size
    
    dw_noisy = [w + generate_gaussian_noise(std_dev) for w in dw_clipped]
    db_noisy = db_clipped + generate_gaussian_noise(std_dev)
    
    return dw_noisy, db_noisy
