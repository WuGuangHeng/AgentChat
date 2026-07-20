"""
AI去水印 v4 — 大范围固定遮罩 + 多轮修复
"""
import cv2
import numpy as np
import sys
import os

def remove_watermark(input_path, output_path):
    img = cv2.imread(input_path)
    if img is None:
        print(f"❌ 无法读取: {input_path}")
        return False

    h, w = img.shape[:2]
    print(f"📐 图片: {w}x{h}")

    full_mask = np.zeros((h, w), dtype=np.uint8)

    # ========== 大范围覆盖常见水印位置 ==========
    # "AI生成" 水印通常在左上角
    # 覆盖 220x50 区域（足够覆盖大部分水印文字）
    full_mask[:55, :220] = 255
    
    # 右上角也可能有
    full_mask[:55, w-220:w] = 255
    
    # 底部角落
    full_mask[h-55:h, :220] = 255
    full_mask[h-55:h, w-220:w] = 255
    
    inpaint_pixels = np.sum(full_mask > 0)
    print(f"   🎯 遮罩: {inpaint_pixels} 像素 ({100*inpaint_pixels/(h*w):.2f}%)")

    # ========== 多轮修复，逐次逼近 ==========
    result = img.copy()
    
    for radius in [3, 5, 7]:
        result = cv2.inpaint(result, full_mask, inpaintRadius=radius, flags=cv2.INPAINT_NS)
    
    cv2.imwrite(output_path, result, [cv2.IMWRITE_JPEG_QUALITY, 100])
    out_size = os.path.getsize(output_path)
    print(f"   ✅ 已保存 ({out_size/1024:.0f}KB)")
    return True

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("用法: python3 remove_watermark.py input.jpg output.jpg")
        sys.exit(1)
    remove_watermark(sys.argv[1], sys.argv[2])
