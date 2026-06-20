import imagehash
from similarity import bytes_to_cv2, compute_ssim, compute_hist_correlation, compute_orb_matches

def check_similarity(img_a_bytes: bytes, img_b_bytes: bytes, phash_a: str, phash_b: str) -> bool:
    # Stage 1: pHash distance check (pHash is grayscale-based, robust to color changes)
    hamming_dist = 12
    if phash_a and phash_b:
        try:
            hash_a = imagehash.hex_to_hash(phash_a)
            hash_b = imagehash.hex_to_hash(phash_b)
            hamming_dist = hash_a - hash_b
            
            # If extremely close, group immediately
            if hamming_dist <= 5:
                return True
            # If far, reject immediately
            if hamming_dist > 18:
                return False
        except Exception as e:
            print(f"Error parsing hex hash: {e}")

    # Load OpenCV images
    cv_a = bytes_to_cv2(img_a_bytes)
    cv_b = bytes_to_cv2(img_b_bytes)

    if cv_a is None or cv_b is None:
        return False

    # Stage 2: Structural Similarity (Grayscale, fully color-invariant)
    ssim = compute_ssim(cv_a, cv_b)
    
    # If structural similarity is high, it is a version of the same image
    if ssim >= 0.74:
        return True

    # Stage 3: ORB keypoints matching (Grayscale, handles scale, crop, and color edits)
    matches_count = compute_orb_matches(cv_a, cv_b)
    if matches_count >= 100:
        return True

    # Tie-breaker using composite score based purely on structure (SSIM) and grayscale phash
    norm_phash = max(0, 1 - (hamming_dist / 64.0))
    score = 0.75 * ssim + 0.25 * norm_phash

    if score >= 0.70:
        return True

    return False

def run_grouping(images_list):
    """
    images_list: list of dicts with 'filename', 'content', 'phash'
    """
    n = len(images_list)
    adj = {i: [] for i in range(n)}

    # Build similarity graph (compare all pairs)
    for i in range(n):
        for j in range(i + 1, n):
            is_similar = check_similarity(
                images_list[i]['content'],
                images_list[j]['content'],
                images_list[i]['phash'],
                images_list[j]['phash']
            )
            if is_similar:
                adj[i].append(j)
                adj[j].append(i)

    # Find connected components
    visited = set()
    components = []

    for i in range(n):
        if i not in visited:
            comp = []
            queue = [i]
            visited.add(i)
            while queue:
                curr = queue.pop(0)
                comp.append(curr)
                for neighbor in adj[curr]:
                    if neighbor not in visited:
                        visited.add(neighbor)
                        queue.append(neighbor)
            components.append(comp)

    # Structure the proposed groups
    proposed_groups = []
    ungrouped = []

    for idx, comp in enumerate(components):
        if len(comp) == 1:
            ungrouped.append(images_list[comp[0]]['filename'])
        else:
            proposed_groups.append({
                "id": f"suggested-{idx + 1}",
                "suggested_name": f"Group {idx + 1}",
                "images": [
                    {"filename": images_list[c]['filename'], "order": order} 
                    for order, c in enumerate(comp)
                ]
            })

    return proposed_groups, ungrouped
