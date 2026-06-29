#!/bin/bash
# 下载公共领域韦特塔罗牌大阿尔卡那图片（22张）
# 来源：Wikimedia Commons — Pamela Colman Smith (1909), Public Domain
# 用法：在项目根目录执行 bash fortune/pages/tarot/download-tarot.sh

DIR="$(cd "$(dirname "$0")" && pwd)/images"
mkdir -p "$DIR"

# 22张大阿尔卡那 — Wikimedia Commons 文件名
CARDS=(
  "00_Fool"
  "01_Magician"
  "02_High_Priestess"
  "03_Empress"
  "04_Emperor"
  "05_Hierophant"
  "06_Lovers"
  "07_Chariot"
  "08_Strength"
  "09_Hermit"
  "10_Wheel_of_Fortune"
  "11_Justice"
  "12_Hanged_Man"
  "13_Death"
  "14_Temperance"
  "15_Devil"
  "16_Tower"
  "17_Star"
  "18_Moon"
  "19_Sun"
  "20_Judgement"
  "21_World"
)

echo "=== 开始下载韦特塔罗牌大阿尔卡那（公共领域）==="
echo "输出目录：$DIR"
echo ""

success=0
fail=0

for card in "${CARDS[@]}"; do
  num="${card%%_*}"
  filename="tarot-${num}.jpg"
  url="https://commons.wikimedia.org/wiki/Special:FilePath/RWS_Tarot_${card}.jpg?width=400"
  
  echo -n "下载 ${filename} ... "
  if curl -L -s -o "$DIR/$filename" "$url" && [ -s "$DIR/$filename" ]; then
    size=$(du -h "$DIR/$filename" | cut -f1)
    echo "成功 (${size})"
    ((success++))
  else
    echo "失败"
    rm -f "$DIR/$filename"
    ((fail++))
  fi
done

echo ""
echo "=== 完成：成功 ${success} 张，失败 ${fail} 张 ==="
echo "图片位于：$DIR"
echo ""
echo "版权说明：Rider-Waite Tarot by Pamela Colman Smith (1909), Public Domain"
