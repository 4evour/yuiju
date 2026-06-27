
"""
mapillary_client.py - Mapillary 街景 CLI 工具
使用 Python 标准库，通过 Mapillary API 获取街景图片和全景图像。

用法：
    python3 mapillary_client.py search <lat> <lon>
    python3 mapillary_client.py search-address "天安门"
    python3 mapillary_client.py random-japan-spot
    python3 mapillary_client.py random-japan
    python3 mapillary_client.py image <image_id>
    python3 mapillary_client.py sequence <image_id>
"""

import argparse
import json
import math
import os
import random
import re
import sys
import urllib.parse
import urllib.request

# ---------------------------------------------------------------------------
# API 配置
# ---------------------------------------------------------------------------
MAPILLARY_ACCESS_TOKEN = ""
MAPILLARY_ACCESS_TOKEN_ENV = "MAPILLARY_ACCESS_TOKEN"


def get_mapillary_access_token() -> str:
    """获取 Mapillary access token。"""
    return os.environ.get(MAPILLARY_ACCESS_TOKEN_ENV) or MAPILLARY_ACCESS_TOKEN


# ---------------------------------------------------------------------------
# Mapillary API Client
# ---------------------------------------------------------------------------

class MapillaryApiClient:
    """Mapillary API v4 客户端，封装街景图片搜索等操作。"""

    BASE_URL = "https://graph.mapillary.com"
    WIKIDATA_SPARQL_URL = "https://query.wikidata.org/sparql"
    WIKIDATA_SPOT_TYPES = [
        {"id": "Q570116", "label": "tourist attraction"},
        {"id": "Q33506", "label": "museum"},
        {"id": "Q23413", "label": "castle"},
        {"id": "Q22698", "label": "park"},
        {"id": "Q697295", "label": "shrine"},
        {"id": "Q44539", "label": "temple"},
        {"id": "Q1107656", "label": "garden"},
    ]

    def __init__(self, api_key: str):
        self.api_key = api_key

    def _get(self, endpoint: str, params: dict = None) -> dict:
        """向 Mapillary API 发起 GET 请求。"""
        url = f"{self.BASE_URL}{endpoint}"
        params = dict(params) if params else {}
        params["access_token"] = self.api_key
        query = urllib.parse.urlencode(params)
        full_url = f"{url}?{query}"
        req = urllib.request.Request(full_url, headers={"Accept": "application/json"})
        with urllib.request.urlopen(req, timeout=15) as r:
            return json.loads(r.read())

    def locationToImageID(self, lat: float = 39.907359, lng: float = 116.391263,
                          limit: int = 5, radius: int = 50) -> dict:
        """搜索指定坐标附近的街景图片 ID（仅返回全景图）。
        参数：
            lat/lng: 搜索中心坐标
            limit: 返回数量上限
            radius: 搜索半径（米）
        返回：{"pano_ids": [image_id, ...]}"""
        lat_delta = radius / 111320
        lng_delta = radius / (111320 * math.cos(math.radians(lat)))
        bbox = ",".join(str(value) for value in [
            lng - lng_delta,
            lat - lat_delta,
            lng + lng_delta,
            lat + lat_delta,
        ])
        data = self._get("/images", {
            "bbox": bbox,
            "limit": limit,
            "is_pano": "true",
            "fields": "id",
        })
        image_ids = [img.get("id", "") for img in data.get("data", []) if img.get("id")]
        return {"pano_ids": image_ids}

    def random_japan_spots(self, limit: int = 20) -> list:
        """从 Wikidata 获取一批日本景点坐标。"""
        spot_type = random.choice(self.WIKIDATA_SPOT_TYPES)
        offset = random.randint(0, 200)
        query = f"""
SELECT ?place ?placeLabel ?coord WHERE {{
  ?place wdt:P17 wd:Q17;
         wdt:P625 ?coord;
         wdt:P31 wd:{spot_type["id"]}.
  SERVICE wikibase:label {{
    bd:serviceParam wikibase:language "zh,ja,en".
  }}
}}
LIMIT {limit}
OFFSET {offset}
"""
        params = urllib.parse.urlencode({"query": query, "format": "json"})
        url = f"{self.WIKIDATA_SPARQL_URL}?{params}"
        req = urllib.request.Request(
            url,
            headers={
                "Accept": "application/sparql-results+json",
                "User-Agent": "HermesAgent/1.0",
            },
        )
        with urllib.request.urlopen(req, timeout=30) as r:
            data = json.loads(r.read())

        spots = []
        for item in data.get("results", {}).get("bindings", []):
            coord = item["coord"]["value"]
            match = re.match(r"Point\(([-0-9.]+) ([-0-9.]+)\)", coord)
            if not match:
                continue
            lon, lat = match.groups()
            wikidata_url = item["place"]["value"]
            spots.append({
                "name": item["placeLabel"]["value"],
                "wikidata_id": wikidata_url.rsplit("/", 1)[-1],
                "lat": float(lat),
                "lon": float(lon),
                "type": spot_type["label"],
            })
        random.shuffle(spots)
        return spots

    def random_japan_spot(self, limit: int = 20) -> dict:
        """从 Wikidata 随机获取一个日本景点坐标。"""
        for _ in range(5):
            spots = self.random_japan_spots(limit=limit)
            if spots:
                return spots[0]
        return {"error": "No Japan spots found from Wikidata"}

    def random_japan_street_view(self, limit: int = 20, image_limit: int = 5, radius: int = 80) -> dict:
        """随机获取一个日本景点附近的 Mapillary 街景图片数据。"""
        for _ in range(5):
            spots = self.random_japan_spots(limit=limit)
            for spot in spots:
                result = self.locationToImageID(
                    lat=spot["lat"],
                    lng=spot["lon"],
                    limit=image_limit,
                    radius=radius,
                )
                pano_ids = result.get("pano_ids", [])
                if pano_ids:
                    sequence_result = self.get_sequence_image_ids(pano_ids[0])
                    if "error" in sequence_result or not sequence_result.get("images"):
                        continue
                    images = sequence_result["images"][:image_limit]
                    return {
                        "spot": spot,
                        "sequence_id": sequence_result.get("sequence_id", ""),
                        "images": images,
                        "count": len(images),
                    }
        return {"error": "No Mapillary panoramas found near random Japan spots"}

    def geocode_address(self, query: str) -> dict:
        """将地址名称转为经纬度坐标（使用 OpenStreetMap Nominatim）。
        返回：{"lat": float, "lon": float, "display_name": str} 或 {"error": str}"""
        import time
        time.sleep(1)  # Nominatim 要求每秒最多 1 次请求
        params = urllib.parse.urlencode({"q": query, "format": "json"})
        url = f"https://nominatim.openstreetmap.org/search?{params}"
        req = urllib.request.Request(url, headers={"User-Agent": "HermesAgent/1.0"})
        with urllib.request.urlopen(req, timeout=10) as r:
            results = json.loads(r.read())
        if not results:
            return {"error": "Address not found", "query": query}
        first = results[0]
        return {
            "lat": float(first.get("lat", 0)),
            "lon": float(first.get("lon", 0)),
            "display_name": first.get("display_name", ""),
        }

    def search_by_address(self, address: str, limit: int = 5, radius: int = 50) -> dict:
        """通过地址搜索附近街景，返回图片列表。
        流程：geocode → 搜索附近全景 → 获取序列图片。
        返回逻辑：
            1 个结果 → 返回该序列前 9 张图片
            3+ 结果 → 随机选 3 个 ID，各取 3 张（共最多 9 张）"""
        # 地址转坐标
        geo = self.geocode_address(address)
        if "error" in geo:
            return geo

        lat, lng = geo["lat"], geo["lon"]
        # 以坐标为中心向 5 个方向扩散搜索，提高找到街景的概率
        offsets = [
            (0, 0),
            (0.0004, 0.0004),
            (-0.0004, 0.0004),
            (0.0004, -0.0004),
            (-0.0004, -0.0004),
        ]

        # 收集所有方向的搜索结果
        all_ids = []
        for dlat, dlng in offsets:
            try:
                result = self.locationToImageID(lat + dlat, lng + dlng, limit=limit, radius=radius)
                pano_ids = result.get("pano_ids", [])
                if pano_ids:
                    all_ids.append(pano_ids[0])
            except Exception:
                continue

        # 去重
        seen, unique_ids = set(), []
        for pid in all_ids:
            if pid not in seen:
                seen.add(pid)
                unique_ids.append(pid)

        spot = {
            "name": address,
            "lat": lat,
            "lon": lng,
            "display_name": geo["display_name"],
        }

        if not unique_ids:
            return {"error": "No panoramas found near this address", "query": address}

        # 只有 1 个唯一 ID 时直接返回该序列全部图片
        if len(unique_ids) == 1:
            sequence_result = self.get_sequence_image_ids(unique_ids[0])
            if "error" in sequence_result:
                return sequence_result
            return {
                "spot": spot,
                "sequence_id": sequence_result.get("sequence_id", ""),
                "images": sequence_result.get("images", []),
                "count": len(sequence_result.get("images", [])),
            }

        # 多个 ID 时随机选取，每序列取 3 张
        selected_ids = random.sample(unique_ids, min(3, len(unique_ids)))
        all_images = []
        seen_sequences = set()
        for img_id in selected_ids:
            seq_result = self.get_sequence_image_ids(img_id)
            if "error" in seq_result or not seq_result.get("images"):
                continue
            seq_id = seq_result.get("sequence_id", "")
            if seq_id in seen_sequences:
                continue
            seen_sequences.add(seq_id)
            images = seq_result["images"]
            sampled = random.sample(images, min(3, len(images)))
            all_images.extend(sampled)

        if not all_images:
            return {"error": "No sequence images found", "query": address}
        return {"spot": spot, "images": all_images, "count": len(all_images)}

    def get_image_detail(self, image_id: str) -> dict:
        """获取单张图片的完整元数据。"""
        return self._get(f"/{image_id}", {
            "fields": "id,captured_at,compass_angle,is_pano,thumb_1024_url,sequence,creator",
        })

    def get_sequence_image_ids(self, image_id: str) -> dict:
        """根据任意一张图片 ID，找到其所属序列，返回序列中前 9 张图片的详情。
        返回图片 URL 和元数据，不下载图片。"""
        # 找到图片所属的序列 ID
        image_data = self._get(f"/{image_id}", {"fields": "sequence"})
        seq_id = image_data.get("sequence", "")
        if not seq_id:
            return {"error": "No sequence found for this image", "image_id": image_id}

        # 获取序列中所有图片 ID
        seq_data = self._get("/image_ids", {"sequence_id": seq_id, "fields": "id"})
        image_ids = [img.get("id", "") for img in seq_data.get("data", []) if img.get("id")]
        if not image_ids:
            return {"sequence_id": seq_id, "images": []}

        image_ids = image_ids[:9]  # 最多取 9 张

        # 获取每张图片的详细信息
        images = []
        for img_id in image_ids:
            detail = self._get(f"/{img_id}", {
                "fields": "id,captured_at,compass_angle,is_pano,thumb_1024_url,sequence,creator",
            })
            images.append(detail)

        return {"sequence_id": seq_id, "images": images}


# ---------------------------------------------------------------------------
# CLI 入口
# ---------------------------------------------------------------------------

def cmd_search(args) -> None:
    """search 子命令：通过坐标搜索街景 ID 列表。"""
    client = MapillaryApiClient(get_mapillary_access_token())
    data = client.locationToImageID(lat=args.lat, lng=args.lon, limit=args.limit)
    print(json.dumps(data, ensure_ascii=False, indent=2))


def cmd_image(args) -> None:
    """image 子命令：获取单张图片的完整详情。"""
    client = MapillaryApiClient(get_mapillary_access_token())
    data = client.get_image_detail(args.image_id)
    if "error" in data:
        print(json.dumps(data, ensure_ascii=False, indent=2))
        sys.exit(1)
    output = {
        "id": data.get("id", ""),
        "captured_at": data.get("captured_at", ""),
        "compass_angle": data.get("compass_angle", None),
        "is_pano": data.get("is_pano", False),
        "thumb_1024_url": data.get("thumb_1024_url", ""),
        "sequence": data.get("sequence", ""),
        "creator": data.get("creator", ""),
    }
    print(json.dumps(output, ensure_ascii=False, indent=2))


def main():
    parser = argparse.ArgumentParser(description="Mapillary 街景 CLI")
    sub = parser.add_subparsers(dest="command")

    # search <lat> <lon> [--limit N]
    search_parser = sub.add_parser("search", help="通过坐标搜索街景 ID（仅全景）")
    search_parser.add_argument("lat", type=float, help="纬度")
    search_parser.add_argument("lon", type=float, help="经度")
    search_parser.add_argument("--limit", type=int, default=5, help="最大返回数量（默认 5）")

    # search-address <地址> [--limit N]
    addr_parser = sub.add_parser("search-address", help="通过地址搜索街景（自动 geocode）")
    addr_parser.add_argument("address", help="地址名称")
    addr_parser.add_argument("--limit", type=int, default=5, help="最大返回数量（默认 5）")

    # random-japan-spot [--limit N]
    spot_parser = sub.add_parser("random-japan-spot", help="随机获取一个日本景点坐标")
    spot_parser.add_argument("--limit", type=int, default=20, help="每次 Wikidata 查询的景点候选数（默认 20）")

    # random-japan [--limit N] [--image-limit N] [--radius N]
    japan_parser = sub.add_parser("random-japan", help="随机获取一个日本景点附近的街景图片数据")
    japan_parser.add_argument("--limit", type=int, default=20, help="每次 Wikidata 查询的景点候选数（默认 20）")
    japan_parser.add_argument("--image-limit", type=int, default=5, help="返回图片数量（默认 5）")
    japan_parser.add_argument("--radius", type=int, default=80, help="Mapillary 搜索半径，单位米（默认 80）")

    # image <image_id>
    img_parser = sub.add_parser("image", help="获取单张图片详情")
    img_parser.add_argument("image_id", help="Mapillary 图片 ID")

    # sequence <image_id>
    seq_parser = sub.add_parser("sequence", help="获取同序列所有图片（前 9 张）")
    seq_parser.add_argument("image_id", help="任意一张图片 ID（自动找所属序列）")

    args = parser.parse_args()
    if not args.command:
        parser.print_help()
        sys.exit(0)

    if args.command == "search":
        cmd_search(args)
    elif args.command == "search-address":
        client = MapillaryApiClient(get_mapillary_access_token())
        data = client.search_by_address(args.address, limit=args.limit)
        print(json.dumps(data, ensure_ascii=False, indent=2))
    elif args.command == "random-japan-spot":
        client = MapillaryApiClient("")
        spot = client.random_japan_spot(limit=args.limit)
        data = spot if "error" in spot else {"spot": spot}
        print(json.dumps(data, ensure_ascii=False, indent=2))
    elif args.command == "random-japan":
        client = MapillaryApiClient(get_mapillary_access_token())
        data = client.random_japan_street_view(
            limit=args.limit,
            image_limit=args.image_limit,
            radius=args.radius,
        )
        print(json.dumps(data, ensure_ascii=False, indent=2))
    elif args.command == "image":
        cmd_image(args)
    elif args.command == "sequence":
        client = MapillaryApiClient(get_mapillary_access_token())
        data = client.get_sequence_image_ids(args.image_id)
        print(json.dumps(data, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
