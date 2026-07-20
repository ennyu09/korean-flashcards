// 用 koroman（依据国立国语院《国语的罗马字表记法》）批量重新生成 vocab.json 里每个词的罗马音（r 字段），
// 覆盖掉之前手工标注的版本。跑完会打印一份变化了的词的对照表，方便人工扫一眼。
const fs = require("fs");
const path = require("path");
const koroman = require("koroman");

const VOCAB_PATH = path.join(__dirname, "..", "vocab.json");

// koroman 在个别词上和《表准发音法》/官方罗马字表记法有出入，人工核对国立国语院问答、
// 표준발음법 조항后确认库输出有误，这里手动订正，避免每次重新生成时又被库的bug覆盖回去：
// - 목요일/월요일/일요일：koroman 错误地对这几个"요일"合成词套用了ㄴ添加规则（[몽뇨일][월료일][일료일]），
//   但国立국어원问答确认这三个词实际只是普通连音，没有ㄴ添加：[모교일][워료일][이료일]
//   （对照组 금요일/수요일/토요일/화요일 koroman 处理是对的，说明bug只出现在这三个特定词上）
// - 깨끗하다/따뜻하다：받침(ㅅ→代表音ㄷ) + 하 送气音化合并成ㅌ时，koroman 错误保留了字母h（-thada），
//   但官方标准里送气音合并后只用合并后辅音本身的罗马字母（参照 좋고->joko、낳다->nota 都不保留h），
//   所以应该是 -tada 不是 -thada（对照组 산책하다 koroman 处理成 sanchaekada 是对的，同一条规则库内部处理不一致）
// - 맛없다：国立국어원问答明确这个词只有[마덥따]一个标准发音（不像"맛있다"有[마싣따]的许可发音），
//   받침ㅅ按代表音ㄷ处理再连音，koroman 却按简单连音处理成了 maseopda，错误
// - 비슷하다/못하다/잘못하다：跟 깨끗하다/따뜻하다 同一类 bug（받침ㅅ+하 送气音合并成ㅌ时错误保留字母h），
//   应该是 -tada 不是 -thada
// - 목욕/목욕탕：跟 목요일 同一类 bug（koroman 错误套用了ㄴ添加规则），国立국어원问答确认목욕实际发音
//   是普通连音[모굑]，没有ㄴ添加
// - 집안일：这次方向相反——koroman 反而漏掉了本该有的ㄴ添加。国立국어원问答明确"집안일"三个条件
//   （合成词/前一음절有받침/后一음절이로开头）全部满足，标准发音是[지반닐]，即"jibannil"
const ROMANIZATION_OVERRIDES = {
  "깨끗하다": "kkaekkeutada",
  "따뜻하다": "ttatteutada",
  "맛없다": "madeopda",
  "목요일": "mogyoil",
  "월요일": "woryoil",
  "일요일": "iryoil",
  "비슷하다": "biseutada",
  "못하다": "motada",
  "잘못하다": "jalmotada",
  "목욕": "mogyok",
  "목욕탕": "mogyoktang",
  "집안일": "jibannil",
};

const data = JSON.parse(fs.readFileSync(VOCAB_PATH, "utf8"));

let total = 0;
let changed = 0;
const diffs = [];

for (const level of data.levels || []) {
  for (const chapter of level.chapters || []) {
    for (const unit of chapter.units || []) {
      for (const word of unit.words || []) {
        total++;
        const newR = ROMANIZATION_OVERRIDES[word.k] ?? koroman.romanize(word.k);
        if (newR !== word.r) {
          diffs.push({ k: word.k, oldR: word.r, newR });
          changed++;
        }
        word.r = newR;
      }
    }
  }
}

fs.writeFileSync(VOCAB_PATH, JSON.stringify(data, null, 2) + "\n", "utf8");

console.log(`共检查 ${total} 个词，其中 ${changed} 个罗马音发生了变化：\n`);
for (const d of diffs) {
  console.log(`  ${d.k}\t${d.oldR ?? "(空)"} -> ${d.newR}`);
}
console.log(`\n已写回 vocab.json。`);
