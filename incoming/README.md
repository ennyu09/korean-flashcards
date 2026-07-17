# 待导入词库

此文件夹用于存放待导入的 Unit 词汇数据。

文件命名格式为 `unitXX_主题韩语名.json`，XX 是两位数 Unit 编号（比如 `unit03_핵심동사1.json` 对应 Unit 3）。

看到新文件后，读取其中每一条记录的全部字段（`korean`、`romanization`、`pos`、`meaning`、`register`、`example`、`exampleTranslation`、`grammarBreakdown`），完整替换到网站对应 Unit 的数据里（`vocab.json`）。

## 使用方式

把新的 Unit json 文件放进这个文件夹，然后跟 Claude 说"检查一下待导入文件夹"，它会扫描这里的新文件并处理。
