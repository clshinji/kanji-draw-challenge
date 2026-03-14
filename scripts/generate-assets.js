/**
 * Minecraft風アセット画像生成スクリプト
 * Gemini API (Nano Banana Pro) を使って13枚のPNG画像を生成
 *
 * 使い方: node scripts/generate-assets.js [画像名]
 *   画像名を指定すると、その1枚だけ生成
 *   指定なしだと全13枚を順番に生成
 */

const fs = require('fs');
const path = require('path');

// .envからAPIキーを読み込み
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const API_KEY = envContent
  .split('\n')
  .find(line => line.startsWith('google-studio-api-key='))
  ?.split('=')[1]
  ?.trim();

if (!API_KEY) {
  console.error('.envにgoogle-studio-api-keyが見つかりません');
  process.exit(1);
}

const OUTPUT_DIR = path.join(__dirname, '..', 'images');

const COMMON_STYLE = 'Minecraft-style pixel art, blocky voxel aesthetic, clean pixel edges, vibrant colors, transparent background PNG, cute chibi proportions suitable for children, no text or watermarks.';

const ASSETS = [
  {
    name: 'mascot-happy',
    prompt: `${COMMON_STYLE} An original blocky student character (NOT Steve or Alex), square head and body like Minecraft characters, wearing a blue school cap and yellow backpack. Happy smiling expression, standing pose. The character has a warm friendly look appealing to 7-year-old children. Simple clean design.`,
  },
  {
    name: 'mascot-excited',
    prompt: `${COMMON_STYLE} The same blocky student character with blue school cap and yellow backpack, now with sparkling star-shaped eyes, both hands raised up in excitement. Very energetic and joyful pose.`,
  },
  {
    name: 'mascot-encouraging',
    prompt: `${COMMON_STYLE} The same blocky student character with blue school cap and yellow backpack, giving a thumbs up with one hand, confident encouraging smile. Supportive and motivating pose.`,
  },
  {
    name: 'mascot-thinking',
    prompt: `${COMMON_STYLE} The same blocky student character with blue school cap and yellow backpack, looking upward with one hand on chin in a thinking pose. Curious and contemplative expression.`,
  },
  {
    name: 'mascot-celebrating',
    prompt: `${COMMON_STYLE} The same blocky student character with blue school cap and yellow backpack, both arms raised high celebrating, confetti particles around, huge joyful smile. Victory celebration pose.`,
  },
  {
    name: 'stamp-diamond',
    prompt: `${COMMON_STYLE} A single Minecraft-style diamond gem, sparkling with light blue and cyan colors, floating with small sparkle particles. Icon style, centered.`,
  },
  {
    name: 'stamp-gold',
    prompt: `${COMMON_STYLE} A single Minecraft-style gold ingot, shiny golden yellow color with subtle shine effect. Icon style, centered.`,
  },
  {
    name: 'stamp-iron',
    prompt: `${COMMON_STYLE} A single Minecraft-style iron ingot, silver-gray metallic color. Icon style, centered.`,
  },
  {
    name: 'bg-pattern',
    prompt: `Minecraft dirt block texture, seamless tileable pattern, pixel art style, brown earth tones with small stone pixels mixed in. Top-down view, 256x256 pixels, game texture style. No transparent background - fully opaque.`,
  },
  {
    name: 'garden-sapling',
    prompt: `${COMMON_STYLE} A small Minecraft-style oak sapling, tiny tree seedling with a few green pixel leaves on a thin brown trunk. Cute and simple, centered.`,
  },
  {
    name: 'garden-flower',
    prompt: `${COMMON_STYLE} A Minecraft-style pink flower (like a peony or rose bush), blocky pink and green pixels, cute and colorful. Single flower, centered.`,
  },
  {
    name: 'garden-tree',
    prompt: `${COMMON_STYLE} A Minecraft-style cherry blossom tree (sakura), pink blocky leaf canopy on a brown trunk, beautiful and cute. Small tree, centered.`,
  },
  {
    name: 'star-xp',
    prompt: `${COMMON_STYLE} A Minecraft-style experience orb, glowing green-yellow sphere with pixel sparkle effect, floating with small light particles. Icon style, centered.`,
  },
];

async function generateImage(asset) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${API_KEY}`;

  const body = {
    contents: [{ parts: [{ text: asset.prompt }] }],
    generationConfig: {
      responseModalities: ['IMAGE', 'TEXT'],
    },
  };

  console.log(`\n生成中: ${asset.name}...`);

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`API error (${response.status}): ${errText}`);
  }

  const data = await response.json();

  // レスポンスから画像データを探す
  const candidates = data.candidates || [];
  for (const candidate of candidates) {
    const parts = candidate.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData && part.inlineData.mimeType?.startsWith('image/')) {
        const buffer = Buffer.from(part.inlineData.data, 'base64');
        const outputPath = path.join(OUTPUT_DIR, `${asset.name}.png`);
        fs.writeFileSync(outputPath, buffer);
        console.log(`  保存: ${outputPath} (${(buffer.length / 1024).toFixed(1)} KB)`);
        return true;
      }
    }
  }

  console.error(`  画像データが見つかりませんでした`);
  console.error(`  レスポンス:`, JSON.stringify(data, null, 2).slice(0, 500));
  return false;
}

async function main() {
  const targetName = process.argv[2];

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  if (targetName) {
    const asset = ASSETS.find(a => a.name === targetName);
    if (!asset) {
      console.error(`不明な画像名: ${targetName}`);
      console.error(`利用可能: ${ASSETS.map(a => a.name).join(', ')}`);
      process.exit(1);
    }
    await generateImage(asset);
  } else {
    console.log(`全${ASSETS.length}枚の画像を生成します...`);
    let success = 0;
    for (const asset of ASSETS) {
      try {
        const ok = await generateImage(asset);
        if (ok) success++;
      } catch (e) {
        console.error(`  エラー (${asset.name}):`, e.message);
      }
      // レート制限回避のため少し待つ
      await new Promise(r => setTimeout(r, 2000));
    }
    console.log(`\n完了: ${success}/${ASSETS.length}枚`);
  }
}

main().catch(e => {
  console.error('致命的エラー:', e);
  process.exit(1);
});
