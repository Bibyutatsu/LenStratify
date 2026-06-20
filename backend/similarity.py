import cv2
import numpy as np
import io
from PIL import Image
import imagehash

def bytes_to_cv2(image_bytes: bytes):
    nparr = np.frombuffer(image_bytes, np.uint8)
    return cv2.imdecode(nparr, cv2.IMREAD_COLOR)

def compute_phash(image_bytes: bytes) -> str:
    try:
        pil_img = Image.open(io.BytesIO(image_bytes))
        h = imagehash.phash(pil_img)
        return str(h)
    except Exception as e:
        print(f"pHash error: {e}")
        return ""

def compute_ssim(img_a: np.ndarray, img_b: np.ndarray) -> float:
    try:
        # Resize img_b to match img_a
        h, w = img_a.shape[:2]
        img_b_resized = cv2.resize(img_b, (w, h))
        
        # Convert to grayscale
        gray_a = cv2.cvtColor(img_a, cv2.COLOR_BGR2GRAY).astype(np.float64)
        gray_b = cv2.cvtColor(img_b_resized, cv2.COLOR_BGR2GRAY).astype(np.float64)
        
        # Constants for SSIM
        C1 = 6.5025
        C2 = 58.5225
        
        # Means
        mu_x = cv2.GaussianBlur(gray_a, (11, 11), 1.5)
        mu_y = cv2.GaussianBlur(gray_b, (11, 11), 1.5)
        
        mu_x_sq = mu_x ** 2
        mu_y_sq = mu_y ** 2
        mu_xy = mu_x * mu_y
        
        # Variances and Covariances
        sigma_x_sq = cv2.GaussianBlur(gray_a ** 2, (11, 11), 1.5) - mu_x_sq
        sigma_y_sq = cv2.GaussianBlur(gray_b ** 2, (11, 11), 1.5) - mu_y_sq
        sigma_xy = cv2.GaussianBlur(gray_a * gray_b, (11, 11), 1.5) - mu_xy
        
        # SSIM calculation
        numerator = (2 * mu_xy + C1) * (2 * sigma_xy + C2)
        denominator = (mu_x_sq + mu_y_sq + C1) * (sigma_x_sq + sigma_y_sq + C2)
        
        ssim_map = numerator / denominator
        return float(ssim_map.mean())
    except Exception as e:
        print(f"SSIM error: {e}")
        return 0.0

def compute_hist_correlation(img_a: np.ndarray, img_b: np.ndarray) -> float:
    try:
        h, w = img_a.shape[:2]
        img_b_resized = cv2.resize(img_b, (w, h))
        
        hsv_a = cv2.cvtColor(img_a, cv2.COLOR_BGR2HSV)
        hsv_b = cv2.cvtColor(img_b_resized, cv2.COLOR_BGR2HSV)
        
        # Compute 2D HSV histogram for H (0-180) and S (0-256)
        hist_a = cv2.calcHist([hsv_a], [0, 1], None, [50, 60], [0, 180, 0, 256])
        hist_b = cv2.calcHist([hsv_b], [0, 1], None, [50, 60], [0, 180, 0, 256])
        
        cv2.normalize(hist_a, hist_a, 0, 1, cv2.NORM_MINMAX)
        cv2.normalize(hist_b, hist_b, 0, 1, cv2.NORM_MINMAX)
        
        corr = cv2.compareHist(hist_a, hist_b, cv2.HISTCMP_CORREL)
        return float(corr)
    except Exception as e:
        print(f"Hist correlation error: {e}")
        return 0.0

def compute_orb_matches(img_a: np.ndarray, img_b: np.ndarray) -> int:
    try:
        gray_a = cv2.cvtColor(img_a, cv2.COLOR_BGR2GRAY)
        gray_b = cv2.cvtColor(img_b, cv2.COLOR_BGR2GRAY)
        
        orb = cv2.ORB_create(nfeatures=500)
        kp_a, des_a = orb.detectAndCompute(gray_a, None)
        kp_b, des_b = orb.detectAndCompute(gray_b, None)
        
        if des_a is None or des_b is None:
            return 0
            
        bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
        matches = bf.match(des_a, des_b)
        
        # Keep only good matches with small distances
        good_matches = [m for m in matches if m.distance < 55]
        return len(good_matches)
    except Exception as e:
        print(f"ORB matches error: {e}")
        return 0
