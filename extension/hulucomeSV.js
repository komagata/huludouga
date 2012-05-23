// コメレイヤーの幅(動画サイズと同じ)
var layerWidth = 896;

// コメレイヤーの高さ
// プレイヤーのコントローラー(再生ボタンなど)には被らないようにサイズを調整
var layerHeight = 480;

// プレイヤーの高さ
var playerHeight = 504;

// コメントのフォントサイズ(固定)
var fontSize = 28;

// コメント行の高さ
var rowHeight = 30;

// コメント行の行数
var rowCount = layerHeight / rowHeight;

// その行の一番右にあるコメントを保持する
var rowRightCome = [];

// コメントが画面の右端から左端まで移動する時間(単位:ミリ秒)
var onTimeDuration = 5000;

// コメントサーバー
var comeServer = "http://huludouga.heroku.com/comments";

// 前のフレームのcurrentTimeを保持する
// プレイヤーからは再生中かどうかを取得する方法がわからなかったため、
// 前のcurrentTimeと比較して違う場合は再生中と判断する。
// ※このため、一時停止中にシークした場合でも再生中と判断してしまう。
var previousTime = 0;

// プレイヤー
var player = null;

// コメント表示用オーバレイレイヤー
var comeLayer = null;

// windowロードイベント
// コメントレイヤーやコメント入力欄の追加、各種初期化処理を行う
// TODO
// ※1 コメントサーバーからコメントを取得する
// ※2 NGワードリスト、NGユーザーリストを取得する
// ※3 ユーザーログイン(TwitterやFacebook利用など)。またはユーザーID生成を行う
window.addEventListener("load", function () {

    // プレイヤーコンテナの取得
    var playerContainer = document.getElementById("player-container");
    // プレイヤーコンテナの高さを設定。(コメント表示レイヤーを追加した時広がってしまうため。)
    playerContainer.style.height = playerHeight + "px";
    // プレイヤー取得
    player = document.getElementById("player");
    // HTMLエレメントを上に表示できるように、
    // プレイヤー(flash)にwmode="opaque"を追加
    player.setAttribute("wmode", "opaque");
    // プレイヤーを一旦非表示にし、再描画を行いwmodeを有効にする。
    // 非表示→表示を早いタイミングでやってしまうと"～一度に視聴いただけるビデオは1本となっております。～"
    // のメッセージが表示されて再生ができなくなるので5秒待ってから表示を行う。
    player.style.display = "none";
    setTimeout(function () { player.style.display = "" }, 5000);

    // コメント入力欄作成
    var comeInput = document.createElement("input");
    comeInput.setAttribute("id", "comeInput");
    comeInput.setAttribute("type", "text");
    playerContainer.parentNode.insertBefore(comeInput, playerContainer.nextSibling);
    comeInput.addEventListener("keydown", function (e) {
        if (e.keyCode == 13) { // Enterキーが押された場合
            var comment = comeInput.value.replace(/^[\s　]+|[\s　]+$/g, '');
            this.value = "";
            // 未入力または空白のみの場合は追加しない
            // TODO
            // ※ これ以外にもにも禁止文字などの処理も必要に応じて追加する
            if (comment == "") return;
            // コメント情報の生成
            // TODO
            // ※ 動画終了間際のコメント投稿の表示開始位置をどうするか
            // ※ コメント最大文字数の設定
            var vp = player.getCurrentTime();
            var newCome = { resNo: 5, uid: '', position: vp, body: comment, messageWidth: 0, row: 0 };
            var ri = searchCanAddeRowIndex(newCome);
            if (ri >= 0) {
                // 追加できる行があった場合、その行インデックスを設定後commentsに追加する。

                // サーバーに追加コメント情報を送信
                var xhr = new XMLHttpRequest();
                xhr.open("POST", "http://huludouga.heroku.com/comments", true);
                xhr.addEventListener("error", function () {
                    // コメント登録失敗
                }, false);
                xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
                xhr.send("comment[movie_id]=" + document.location.pathname.substr(7) + "&comment[body]=" + comment + "&comment[position]=" + vp);
                newCome.row = ri;
                comments[comments.length] = newCome;
            }
        }
    });

    // コメント表示用オーバレイレイヤーの作成
    comeLayer = document.createElement("div");
    comeLayer.setAttribute("id", "comeLayer");
    comeLayer.style.width = layerWidth + "px";
    comeLayer.style.height = layerHeight + "px";
    comeLayer.style.top = -playerHeight + "px";
    playerContainer.insertBefore(comeLayer, player.nextSibling);

    // コメント表示幅を計測するためのエレメントを作成
    var measure = document.createElement("span");
    measure.setAttribute("id", "measure");
    measure.style.visibility = "hidden";
    measure.style.fontSize = fontSize + "px";
    document.body.appendChild(measure);

    // コメントを取得
    getComment(
        "http://huludouga.heroku.com/comments.json?movie_id=" + document.location.pathname.substr(7),
        function (res) {
            comments = JSON.parse(res);
            // コメント配列をpositionでソート
            comments.sort(function (x, y) { return x.position - y.position });

            for (var ci = 0, cl = comments.length; ci < cl; ci++) {
                // dateを文字列からDate型に変換
                //comments[ci].date = new Date(comments[ci].date);

                // コメントの幅を前もって取得しておく(messageWidthキー要素追加)
                measure.textContent = comments[ci].body;
                comments[ci].messageWidth = measure.offsetWidth;

                comments[ci].flag = false;
                comments[ci].element = null;

            }

            for (var ri = 0; ri < rowCount; ri++) {
                // 行最右コメントNo配列初期化
                rowRightCome[ri] = null;
            }

            start = +new Date;

            // フレームループ開始
            webkitRequestAnimationFrame(step);
        },
        function () {
            // おそらくURL間違っている
        },
        3000
    );



}, true);


// AJAXデータ取得
// サーバーエラー時はリトライ
function getComment(uri, data_callback, error_callback, timeout) {
    var tryAgain = function () {
        getComment(uri, data_callback, error_callback, timeout);
    }
    var r = new XMLHttpRequest();
    var timer = setTimeout(
        function () {
            r.abort();
            r.onreadystatechange = null;
            setTimeout(tryAgain, timeout);
        },
        timeout);
    r.open("GET", uri, true);
    r.onreadystatechange = function () {
        if (r.readyState != 4) {
            // Ignore non-loaded readyStates
            // ...will timeout if do not get to "Loaded"
            return;
        }
        clearTimeout(timer);  // readyState==4, no more timer
        if (r.status == 200) {  // "OK status"
            data_callback(r.responseText);
        }
        else if (r.status == 304) {
            // "Not Modified": No change to display
        }
        else if (r.status >= 400 && r.status < 500) {
            // Client error, probably bad URI
            error_callback(r)
        }
        else if (r.status >= 500 && r.status < 600) {
            // Server error, try again after delay
            setTimeout(tryAgain, timeout);
        }
        else {
            error_callback(r);
        }
    }
    r.send(null);
    return r;
}

// フレームループ関数
function step() {

    if (player.getCurrentTime) {
        // プレイヤーのcurrentTimeを取得
        var currentTime = player.getCurrentTime();

        // 前フレームでのcurrentTimeと比較し違う場合に、
        // コメント表示処理を行う
        if (currentTime != previousTime) {
            // 前フレームでのcurrentTimeが今回のcurrentTimeより大きい場合は
            // 前にシークした時であるため、現在表示しているコメントを
            // 一旦すべて削除し、管理情報を初期化する。
            if (previousTime > currentTime) {
                while (comeLayer.firstChild) {
                    comeLayer.removeChild(comeLayer.firstChild);
                }
                for(var ci = 0, l = comments.length; ci < l; ci++){
                    comments[ci].element = null;
                    comments[ci].flag = null;
                }
                for (var ri = 0; ri < rowCount; ri++) {
                    rowRightCome[ri] = null;
                }
            }

            // コメントを表示
            render(currentTime);
        }

        // 前フレームcurrentTimeを更新
        previousTime = currentTime;
    }
    // 次のフレームをリクエスト(という日本語が正しいのかどうか…)
    webkitRequestAnimationFrame(step);
}


// コメント描画処理
// 適切な範囲内のコメだけでループして処理するいい方法が思いつかなかったため、
// 毎フレームごとに全コメループ処理
// TODO
// ※ NGワードを含むコメント、NGユーザーのコメントを飛ばす処理
function render(currentTime) {
    for (var ci = 0, cl = comments.length; ci < cl; ci++) {
        var come = comments[ci];

        // 表示開始からの経過時間算出
        var onTime = currentTime - come.position;
        if (onTime > 0) { // 表示時間に達した場合
            // コメントエレメント表示位置計算
            var comeLeft = layerWidth - (come.messageWidth + layerWidth) * onTime / onTimeDuration;
            var comeRight = comeLeft + come.messageWidth - layerWidth;
            if (come.flag) {
                if (onTime > onTimeDuration && come.flag) {
                    comeLayer.removeChild(come.element);
                    come.element = null;
                    come.flag = false;
                } else {
                    come.element.style.left = comeLeft + "px";
                }
            } else {
                var ri = searchCanAddeRowIndex(come);
                if (ri == -1) continue;
                // コメントエレメントを作成
                var comeElement = document.createElement("span");
                comeElement.className = "come";
                comeElement.textContent = come.body;
                comeElement.setAttribute("id", come.resNo);
                comeElement.style.left = comeLeft + "px";
                comeLayer.appendChild(comeElement);
                // コメントの表示位置(行)を設定
                comeElement.style.top = (ri * rowHeight) + "px";
                comeElement.style.fontSize = fontSize + "px";
                // 行最右コメント更新
                rowRightCome[ri] = come;
                come.flag = true;
                come.element = comeElement;
                come.right = comeRight;
            }
        }
    }
}

// コメントを追加できる行を検索。
// あればその行のインデックスを返し、無ければ-1を返す
// TODO
// ※1 コメントが多い場合追加できる行がなくなってしまった時の処理
// ※2 ※1とほぼ同じだが、いわゆる弾幕の処理(ただ、個人的に弾幕は好きではない)
function searchCanAddeRowIndex(come) {
    for (var ri = 0; ri < rowCount; ri++) {
        if (rowRightCome[ri] != null) { // その行にコメントがある場合
            var prevCome = rowRightCome[ri];
            if (come.right > 0) continue;
            // 同じ行に短いコメントのあとに長いコメントが続くと
            // 短いコメントと長いコメントが重なってしまう場合があるので
            // 重なるか判定を行う
            // TODO
            // ※コード組んでは見たものの全然うまく行かない

            // 追加するコメントの左端到達時点での既存のコメントの右端位置を求める。
            //var prevComePos = layerWidth + prevCome.messageWidth - (prevCome.messageWidth + layerWidth) * ((come.position - prevCome.position) + layerWidth / (come.messageWidth + layerWidth) * onTimeDuration) / onTimeDuration;
            // 重なる幅が10px以内を許容範囲とする。
            //if (prevComePos >= 10) continue;
            // 上記の式ではうまくいかないため適当な判定式で判定
            if ((come.position - prevCome.position) + layerWidth / (come.messageWidth + layerWidth) * onTimeDuration - 100 < onTimeDuration) continue;
        }
        return ri;
    }
    return -1;
}