// 批量调用 Google Cloud Text-to-Speech，把 vocab.json 里每个词的读音 + 例句读音生成成 mp3，
// 存进 ../audio 文件夹。已经存在的文件会跳过（增量执行，方便以后只给新词补音频）。
const fs = require("fs");
const path = require("path");

const VOCAB_PATH = path.join(__dirname, "..", "vocab.json");
const AUDIO_DIR = path.join(__dirname, "..", "audio");
const VOICE_NAME = "ko-KR-Neural2-A"; // 女声・自然亲切。想换声音改这一行就行。
const DELAY_MS = 150; // 请求间隔，避免触发速率限制

function loadApiKey() {
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) {
    console.error(
      "找不到 scripts/.env 文件。请复制 scripts/.env.example 为 scripts/.env，并填入你的 Google Cloud API 密钥。"
    );
    process.exit(1);
  }
  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (key === "GOOGLE_TTS_API_KEY") return value;
  }
  console.error("scripts/.env 里没有找到 GOOGLE_TTS_API_KEY。");
  process.exit(1);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function synthesize(apiKey, text) {
  const res = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode: "ko-KR", name: VOICE_NAME },
        audioConfig: { audioEncoding: "MP3" },
      }),
    }
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HTTP ${res.status}: ${body}`);
  }
  const json = await res.json();
  return Buffer.from(json.audioContent, "base64");
}

async function main() {
  const apiKey = loadApiKey();
  const data = JSON.parse(fs.readFileSync(VOCAB_PATH, "utf8"));
  fs.mkdirSync(AUDIO_DIR, { recursive: true });

  const jobs = [];
  for (const level of data.levels || []) {
    for (const chapter of level.chapters || []) {
      for (const unit of chapter.units || []) {
        for (const word of unit.words || []) {
          jobs.push({ text: word.k, file: `${word.k}.mp3` });
          if (word.e) jobs.push({ text: word.e, file: `${word.k}_example.mp3` });
        }
      }
    }
  }

  let generated = 0;
  let skipped = 0;
  let failed = 0;

  for (const job of jobs) {
    const filePath = path.join(AUDIO_DIR, job.file);
    if (fs.existsSync(filePath)) {
      skipped++;
      continue;
    }
    try {
      const audio = await synthesize(apiKey, job.text);
      fs.writeFileSync(filePath, audio);
      generated++;
      console.log(`生成: ${job.file}`);
    } catch (err) {
      failed++;
      console.error(`失败: ${job.file} — ${err.message}`);
    }
    await sleep(DELAY_MS);
  }

  console.log(
    `\n完成。生成 ${generated} 个，跳过（已存在）${skipped} 个，失败 ${failed} 个。`
  );
}

main();
