# VOICEVOX 音声ノート

無料の非公式WEB版VOICEVOX API（tts.quest）を使う音声生成サイトです。
公開後は、元のPCやVOICEVOXアプリを起動せずに、スマホ・別PCのブラウザーから使えます。
ビルド、Python、APIキー、カード登録は不要です。

## GitHub Pagesで公開する手順

1. 配布されたZIPを展開します。**ZIPそのものはアップロードしません。**
2. GitHubで新しいリポジトリを作成します。GitHub FreeでPagesを利用する場合は、公開リポジトリ（Public）にします。
3. 「Add file」→「Upload files」で、展開した中のファイルをアップロードします。`index.html`がリポジトリの最上位に来るようにします。フォルダーで一段包まないでください。
4. 「Commit changes」で保存します。
5. 「Settings」→「Pages」→「Build and deployment」で、Sourceを **Deploy from a branch** にします。
6. Branchを **main**、フォルダーを **/(root)** にして「Save」を押します。
7. Pages画面に公開URLが表示されたら開きます。反映には数分かかる場合があります。

通常の公開URLは `https://ユーザー名.github.io/リポジトリ名/` です。
設定手順は[GitHub公式ドキュメント](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)でも確認できます。

ファイルの配置：

```text
index.html
style.css
app.js
api.mjs
README.md
.nojekyll
```

`.nojekyll`は空の補助ファイルです。拡張子`.mjs`も省略せずアップロードしてください。
元のPython版・`.packages`・`.git`・`.openai`・ログファイルをアップロードする必要はありません。

## 公開範囲

このサイトにログイン機能はありません。**通常のGitHub Pages公開では、サイトは誰でも閲覧できます。**
リポジトリをPrivateにするだけではサイトのアクセス制限にはなりません。
`noindex`は検索エンジンへの掲載抑制の指定で、非公開化する機能ではありません。
本人専用アクセスを維持する場合は、認証付きの別の設置先が必要です。

## できること

- APIで提供されているVOICEVOXの話者・スタイルを選択
- 200文字までの文章から音声生成
- 再生、一時停止、再生位置の変更
- 再生速度の調整（0.5〜2.0倍）
- WAVファイルのダウンロード
- ブラウザー内への音声の記録と再生

## 制限とデータの扱い

- 生成する文章と話者IDを、外部サービス`tts.quest`へ送信します。
- カード登録・APIキーなしで利用するため、待ち時間や利用制限があります。表示された間隔を守ってください。
- 提供側の仕様変更や停止の影響を受け、継続利用を保証するものではありません。
- 文字ごとのピッチ調整には対応していません。
- 速度調整は再生時のみです。ダウンロードするWAV音声は標準速度です。
- 記録は今のブラウザー内に音声データとして保存し、他端末とは同期しません。
- ブラウザーの保存データを削除すると記録も消えます。残したい音声はダウンロードしてください。
- APIの音声URLはいずれ消去されますが、「この端末に記録」で保存した音声データはブラウザー内に残ります。
- ページのHTMLをダブルクリックするだけでは動作しません。公開したHTTPSのURLから利用してください。

## 音声の利用

このサイトはVOICEVOX公式によるものではありません。
音声合成：[VOICEVOX](https://voicevox.hiroshiba.jp/)
API：[非公式WEB版VOICEVOX API](https://voicevox.su-shiki.com/su-shikiapis/ttsquest/)

音声を外部で利用する際は、VOICEVOXと各音声ライブラリの利用規約を確認し、必要なクレジットを表示してください。
サイト内では生成に使用した話者名を表示します。
