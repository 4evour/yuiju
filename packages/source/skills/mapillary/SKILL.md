---
name: mapillary
description: "当用户需要街景图片、全景图，或希望通过 Mapillary 街景照片探索某个地点时使用。支持随机获取一个日本景点，并返回附近 Mapillary 街景图片 JSON 数据。Skill 只返回地点与图片元数据，不下载图片、不识图；需要描述图片时，由 Hermes Agent 使用返回的图片 URL 自行分析。"
version: 1.0.0
author: ywxx252324
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [Mapillary, street view, panorama, street-level, location, explore]
    category: productivity
    related_skills: [maps]
    requires_toolsets: [terminal]
---

# Mapillary — 街景探索

通过 Wikidata 获取日本景点坐标，并通过 Mapillary API 获取附近街景图片和全景图像。也支持用户输入地点名称，返回该位置附近的街景图片 JSON 数据。

**前提：** 运行前必须提供 Mapillary access token。

```bash
export MAPILLARY_ACCESS_TOKEN="MLY|..."
```

```bash
# 运行示例
python3 scripts/mapillary_client.py random-japan
# 应返回一个日本景点及其附近的 Mapillary 街景图片 JSON 数据
```

## 快速使用

```bash
MAP="python3 scripts/mapillary_client.py"
```

## 命令说明

### random-japan — 随机日本景点云旅游

```bash
# 从 Wikidata 随机获取一个日本景点，并返回附近 Mapillary 街景图片数据
$MAP random-japan
$MAP random-japan --limit 30 --image-limit 5 --radius 80
```

**返回逻辑：**
- 在脚本中随机选择一个 Wikidata 景点类型，查询一小批位于日本、带坐标的景点候选
- 随机性由脚本完成，避免在 Wikidata SPARQL 中使用重排序查询
- 逐个用候选坐标搜索 Mapillary 全景图
- 找到有全景图的地点后，返回同序列图片详情
- 只返回地点与图片 JSON 数据，不下载图片、不生成描述

### search-address — 通过地址搜索（自动 geocode）

```bash
# 自动将地址转为坐标并搜索附近街景
$MAP search-address "清水寺"
$MAP search-address "伏見稲荷大社"
```

**返回逻辑：**
- 1 个搜索结果：返回该序列前 9 张图片详情
- 3 个及以上结果：随机抽取 3 个 ID，查各自序列，每序列随机抽 3 张（共最多 9 张）

## 输出格式

### random-japan 返回

```json
{
  "spot": {
    "name": "清水寺",
    "wikidata_id": "Q...",
    "lat": 34.9949,
    "lon": 135.785,
    "type": "temple"
  },
  "sequence_id": "0HXSH2hA0apL7DrQA-Yvpw",
  "images": [
    {
      "id": "...",
      "captured_at": "...",
      "compass_angle": 45.2,
      "is_pano": true,
      "thumb_1024_url": "https://...",
      "sequence": "0HXSH2hA0apL7DrQA-Yvpw",
      "creator": "..."
    }
  ],
  "count": 9
}
```

### search-address 返回

```json
{
  "spot": {
    "name": "清水寺",
    "lat": 34.9949,
    "lon": 135.785,
    "display_name": "..."
  },
  "images": [
    {
      "id": "...",
      "captured_at": "...",
      "compass_angle": 45.2,
      "is_pano": true,
      "thumb_1024_url": "https://...",
      "sequence": "0HXSH2hA0apL7DrQA-Yvpw",
      "creator": "..."
    }
  ],
  "count": 9
}
```

## 命令参考

| 命令 | 说明 |
|------|------|
| `random-japan` | 随机获取一个日本景点附近的街景图片数据 |
| `search-address <地址>` | 搜索某一个景点或地点附近的街景图片数据 |

## 注意事项

- **频率限制**：Nominatim（geocode）有 1 req/s 限制，脚本已内置 sleep
- **景点来源**：random-japan 使用 Wikidata SPARQL 查询日本景点坐标；为避免超时，不在 SPARQL 内使用随机排序
- **序列数量**：sequence 接口最多返回 9 张图片
- **全景优先**：search 默认只返回 `is_pano=true` 的全景图
- **图片 URL**：Skill 返回的 `thumb_1024_url` 是可直接访问的图片 URL；Hermes Agent 需要基于该字段自行分析图片

## 常见问题

1. **无结果** — 该位置可能没有 Mapillary 街景覆盖
2. **Nominatim 超时** — 检查网络，geocode 有 10s 超时
3. **Wikidata 超时** — random-japan 依赖 Wikidata SPARQL 服务，网络或服务繁忙时可能失败

## 相关

- `maps` skill — OpenStreetMap 数据，用于地理编码和 POI 搜索（无街景）
