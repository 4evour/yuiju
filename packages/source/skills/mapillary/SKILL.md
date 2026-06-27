---
name: mapillary
description: "当用户想随机进行日本云旅游，或指定一个日本景点/地点查看附近街景图片时使用。调用脚本返回地点信息和 Mapillary 图片 JSON；你需要使用返回的 thumb_1024_url 自行分析图片并描述感受。"
author: ywxx252324
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [Mapillary, street view, panorama, Japan travel, location, explore]
    category: productivity
    requires_toolsets: [terminal]
---

# Mapillary 日本云旅游

使用这个 Skill 获取日本街景图片数据。Skill 只返回 JSON，不下载图片、不识图、不生成旅行感受。

## 何时使用

- 用户想随机去一个日本景点云旅游。
- 用户指定一个日本景点、城市、街区或地点，想查看附近街景。

## 命令

先设置命令别名：

```bash
MAP="python3 scripts/mapillary_client.py"
```

随机日本景点：

```bash
$MAP random-japan --limit 30 --image-limit 5 --radius 80
```

指定地点：

```bash
$MAP search-address "清水寺" --limit 5
$MAP search-address "伏見稲荷大社" --limit 5
```

调用 `random-japan` 和 `search-address` 时必须显式传入 `--limit`。

- `random-japan --limit`：每次从景点数据源查询的日本景点候选数量。候选越多，越容易找到附近有 Mapillary 全景图的地点，但请求可能更慢。
- `search-address --limit`：每次在指定地点附近搜索 Mapillary 全景图 ID 的数量。它不是最终图片数量，最终返回数量还会受附近街景覆盖和序列图片数量影响。

## 输出使用规则

- 只使用 `images[].thumb_1024_url` 作为图片 URL。
- 不要假设其他 URL 字段可以作为图片使用。
- 拿到图片 URL 后，你自己分析图片内容，再用自然语言描述看到的景色和感受。
- 返回 `error` 时，告诉用户该地点附近暂时没有可用街景，或本次随机探索没有找到合适图片。

## 返回结构

```json
{
  "spot": {
    "name": "清水寺",
    "lat": 34.9949,
    "lon": 135.785
  },
  "images": [
    {
      "id": "...",
      "thumb_1024_url": "https://...",
      "is_pano": true,
      "captured_at": 1524135844664
    }
  ],
  "count": 1
}
```
