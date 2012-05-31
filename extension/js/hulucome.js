// コメレイヤーの幅(動画サイズと同じ)
var layerWidth = 896;

// コメレイヤーの高さ
// プレイヤーのコントローラー(再生ボタンなど)には被らないようにサイズを調整
var layerHeight = 480;

// プレイヤーの高さ
var playerHeight = 504;

// コメントの最大文字数
var comeMaxLength = 60;

// 動画の長さが30分の場合でのコメント取得数
var thirtyMinComeCount = 2000;

// コメントのフォントサイズ(固定)
var fontSize = 28;

// コメント行の高さ
var rowHeight = 30;

// コメント行の行数
var rowCount = layerHeight / rowHeight;

// コメントリストの幅
var comeListWidth = 215;

// コメントリストコンテナーの幅
var comeListContainerWidth = comeListWidth + 17;

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

// プレイヤーコンテナー
var playerContainer = null;

// プレイヤー
var player = null;

// コメント表示用オーバレイレイヤー
var comeLayer = null;

// コメントリスト(エレメント)
var comeList = null;

// コメントリストグリッド
var comeListGrid = null;

// ヘッダークリック禁止マスク
var headerClickMask = null;

// コンテンツID
var contentID = null

// アスペクト比
var aspectRatio = 0;

var isPopOutPlayer = false;

// ポップアウトプレイヤーリサイズ中フラグ
var isResizing = false;

// リサイズ終了チェックタイムアウトID
var resizedID = null;

// コメント配列(JSON.parseで配列として取得)
var comments = [];

// 動画の長さ
var movieDuration = 0;

// 再生中フラグ
// プレイヤーからは再生中かどうかを取得することができないため
// ループ時にこちらで再生中かどうかをチェックする
var isPlaying = false;
var playingState = 0;


// ローカルストレージに保持される変数
// コメント表示フラグ
var isComeDisplay = true;
// 自動スクロールフラグ
var isAutoScroll = false;
// コメントリストのソート状態
var sortCol = null;
var sortAsc = true;
// ユーザーID
var userID = null;
// NGコメント
var ngComments = [];
// NGユーザー
var ngUsers = [];

// windowロードイベント
// コメントレイヤーやコメント入力欄の追加、各種初期化処理を行う
window.addEventListener("load", function () {
    // ローカルストレージから設定情報を取得
    getLocalStorage();

    // プレイヤー取得
    player = document.getElementById("player");
    setTimeout(getInfo, 100);

}, false);

function getInfo() {
    if (player.getDuration) {
        movieDuration = player.getDuration();
        firstInit();
    } else {
        setTimeout(getInfo, 100);
    }
}

function firstInit() {
    for (var ri = 0; ri < rowCount; ri++) {
        // 行最右コメントNo配列初期化
        rowRightCome[ri] = null;
    }

    // コメント表示幅を計測するためのエレメントを作成
    var measure = document.createElement("span");
    measure.setAttribute("id", "measure");
    measure.style.visibility = "hidden";
    measure.style.fontSize = fontSize + "px";
    document.body.appendChild(measure);

    layerWidth = player.offsetWidth;

    isPopOutPlayer = (document.location.href.indexOf("stand_alone") != -1);
    if (isPopOutPlayer) {
        popOutPlayerLoad();
    } else {
        pagePlayerLoad();
    }

    // HTMLエレメントを上に表示できるように、
    // プレイヤー(flash)にwmode="opaque"を追加
    player.setAttribute("wmode", "opaque");
    // プレイヤーを一旦非表示にし、再描画を行いwmodeを有効にする。
    // 非表示→表示を早いタイミングでやってしまうと"～一度に視聴いただけるビデオは1本となっております。～"
    // のメッセージが表示されて再生ができなくなるので5秒待ってから表示を行う。
    player.style.display = "none";
    setTimeout(function () {
        player.style.display = "";
        // ★
        if (comments.length) step();
    }, 5000);

    getComment();
}

// ローカルストレージデータ取得関数
// ※ローカルストレージではboolean型は文字列で保存されるため
// 取得時は x = val == "true" などで取得
function getLocalStorage() {
    // ローカルストレージから設定情報を取得
    // ユーザーIDはポップアウトプレイヤー用に使用するため
    // この時点でローカルストレージからの取得は行わない。
    if (localStorage.isComeDisplay) {
        isComeDisplay = localStorage.isComeDisplay == "true";
    } else {
        isComeDisplay = true;
    }
    if (localStorage.isAutoScroll) {
        isAutoScroll = localStorage.isAutoScroll == "true";
    } else {
        isAutoScroll = false;
    }
    if (localStorage.sortCol) {
        sortCol = localStorage.sortCol;
    } else {
        // コメントリストのソート列のデフォルトは"書込日時"にする
        sortCol = "updated_at";
    }
    if (localStorage.sortAsc) {
        sortAsc = localStorage.sortAsc == "true";
    } else {
        sortAsc = true;
    }
    if (localStorage.ngComments) {
        ngComments = localStorage.ngComments;
    } else {
        ngComments = [];
    }
    if (localStorage.ngUsers) {
        ngUsers = localStorage.ngUsers;
    } else {
        ngUsers = [];
    }
}


function pagePlayerLoad() {
    // プレイヤーコンテナーの取得
    playerContainer = document.getElementById("player-container");
    // flashvarsを連想配列に展開
    var flashvars = getFlashVars(player);
    // コンテンツIDの取得
    contentID = flashvars.content_id;
    // ユーザーIDをグローバル変数及びローカルストレージに保存
    localStorage.userID = userID = flashvars.user_id;
    // コメント表示用オーバレイレイヤーの作成
    comeLayer = document.createElement("div");
    comeLayer.setAttribute("id", "comeLayer");
    comeLayer.style.width = layerWidth + "px";
    comeLayer.style.height = layerHeight + "px";
    comeLayer.style.visibility = isComeDisplay ? "" : "hidden";
    comeLayer.style.position = "absolute";
    comeLayer.style.left = player.offsetLeft +"px";
    comeLayer.style.top = player.offsetTop +"px";
    playerContainer.appendChild(comeLayer);
    // コメントリストコンテナの作成
    var comeListContainer = document.createElement("div");
    comeListContainer.setAttribute("id", "comeListContainer");
    comeListContainer.style.position = "absolute";
    comeListContainer.style.width = comeListContainerWidth + "px";
    comeListContainer.style.height = (playerHeight - 20) + "px";
    comeListContainer.style.top = player.offsetTop + "px";
    comeListContainer.style.left = (player.offsetLeft + layerWidth + 10) + "px";
    playerContainer.appendChild(comeListContainer);
    // コメントリスト用エレメントの作成
    comeList = document.createElement("div");
    comeList.setAttribute("id", "comeList");
    comeList.style.width = comeListContainerWidth + "px";
    comeList.style.height = (playerHeight - 20) + "px";
    comeListContainer.appendChild(comeList);
    // コメントリストグリッド初期化
    initComeListGrid();
    // 自動スクロールチェックボックスの作成
    var cbAutoScroll = document.createElement("input");
    cbAutoScroll.setAttribute("type", "checkbox");
    cbAutoScroll.setAttribute("id", "cbAutoScroll");
    cbAutoScroll.checked = isAutoScroll;
    comeListContainer.appendChild(cbAutoScroll);
    cbAutoScroll.addEventListener("click", cbAutoScrollClick, false);
    // 自動スクロールチェックボックス用ラベルの作成
    var lblAutoScroll = document.createElement("label");
    lblAutoScroll.setAttribute("id", "lblAutoScroll");
    lblAutoScroll.setAttribute("for", "cbAutoScroll");
    lblAutoScroll.textContent = "自動スクロールする";
    comeListContainer.appendChild(lblAutoScroll);
    // コントロールパネルの作成
    var controlPanel = document.createElement("div");
    controlPanel.setAttribute("id", "comeControlPanel");
    controlPanel.style.width = layerWidth + "px";
    controlPanel.style.margin = "0 auto";
    controlPanel.style.height = "30px";
    playerContainer.parentNode.insertBefore(controlPanel, playerContainer.nextSibling);
    // コントロールパネルにコメント入力欄を作成
    var comeInput = document.createElement("input");
    comeInput.setAttribute("id", "comeInput");
    comeInput.setAttribute("type", "text");
    //comeInput.style.marginLeft = player.offsetLeft + "px";
    comeInput.style.margin = "4px 0";
    // 無料視聴の場合はコメント投稿は行えないようにする。
    comeInput.style.visibility = userID == "-1" ? "hidden" : "";
    controlPanel.appendChild(comeInput);
    comeInput.addEventListener("keydown", comeInputKeydown, false);
    // コントロールパネルにコメント表示切り替えボタンを作成
    var btnComeDisplay = document.createElement("div");
    btnComeDisplay.setAttribute("id", "btnComeDisplay");
    btnComeDisplay.setAttribute("title", "コメント表示切替");
    btnComeDisplay.className = isComeDisplay ? "comeDisplay" : "comeNoDisplay";
    controlPanel.appendChild(btnComeDisplay);
    btnComeDisplay.addEventListener("click", btnComeDisplayClick, false);
}

// ポップアウトプレイヤーロードイベント処理
function popOutPlayerLoad() {
    // プレイヤーコンテナーの取得
    playerContainer = document.getElementById("v");
    // プレイヤーコンテナーリサイズ時にコメレイヤーをリサイズ
    playerContainer.addEventListener("resize", popOutResize, false);
    // flashvarsを連想配列に展開
    var flashvars = getFlashVars(player);
    // lcnameの値(base64文字列)をデコードし、contentIDの値を取得
    contentID = getContentIDValue(Base64Binary.decodeArrayBuffer(flashvars.lcname));
    // ローカルストレージからユーザーID取得
    userID = localStorage.userID;
    // コメント表示用オーバレイレイヤーの作成
    comeLayer = document.createElement("div");
    comeLayer.setAttribute("id", "comeLayer");
    comeLayer.style.width = "100%";
    comeLayer.style.height = "100%";
    comeLayer.style.visibility = isComeDisplay ? "" : "hidden";
    comeLayer.style.position = "absolute";
    comeLayer.style.left = comeLayer.style.top = 0 + "px";
    playerContainer.appendChild(comeLayer);
    // 初期表示のアスペクト比を取得
    aspectRatio = player.offsetWidth / player.offsetHeight;
    // 行の高さを計算
    rowHeight = rowCount / player.offsetHeight;
    // フォントサイズを計算
    fontSize = rowHeight - 2;
    // コメント幅取得用エレメントにフォントサイズを適用
    measure.style.fontSize = fontSize + "px";
}

// 自動スクロールチェックボックスクリックイベントハンドラ関数
function cbAutoScrollClick(e) {
    // ローカルストレージ及びグローバル変数に自動スクロールフラグを保存
    localStorage.isAutoScroll = isAutoScroll = cbAutoScroll.checked;
    if (cbAutoScroll.checked) { // 自動スクロールチェックボックスにチェックを入れた場合
        var sortCols = comeListGrid.getSortColumns();
        if (sortCols.length == 0) { // ソートされていない場合
            sortCol = null;
        } else { // ソートされている場合
            // 現在のソート状態を保持
            sortCol = sortCols[0].columnId;
            sortAsc = sortCols[0].sortAsc;
        }
        // コメントリストを"位置"でソートする。
        comeListGrid.setSortColumns("position", true);
        commentsSort("position", true);
        comeListGridDataBind();
        headerClickMask.style.display = "";
    } else { // 自動スクロールチェックボックスにチェックをはずした場合
        if (sortCol) { // 自動スクロール前のソート状態が保持されている場合
            // 自動スクロール前のソートに戻す。
            comeListGrid.setSortColumn(sortCol, true);
            commentsSort(sortCol, sortAsc);
            comeListGridDataBind();
        }
        headerClickMask.style.display = "none";
    }
}

// コメント入力テキストボックキーダウンイベントハンドラ関数
function comeInputKeydown(e) {
    if (e.keyCode == 13) { // Enterキーが押された場合
        // 前後のスペースを削除して入力されたコメントを取得
        var comment = comeInput.value.replace(/^[\s　]+|[\s　]+$/g, '');
        // 未入力または空白のみの場合はコメントの登録を行わない
        if (comment == "") return;
        // コメントが最大文字数を超えている場合は、最大文字数以降カットする
        if (comment.length > comeMaxLength) {
            comment = comment.substr(0, comeMaxLength);
        }
        // 現在の再生位置を取得
        var vp = player.getCurrentTime();
        // コメント幅取得
        measure.textContent = comment;
        var mw = measure.offsetWidth;
        // コメント情報の生成
        var newCome = { body: comment, updated_at: +new Date(), movie_id: contentID, position: vp, messageWidth: mw, flag: false, element: null };
        // コメント入力欄を無効にする
        comeInput.disabled = true;
        // サーバーに追加コメント情報を送信
        xhrfunc("POST", comeServer, "comment[movie_id]=" + contentID + "&comment[body]=" + comment + "&comment[position]=" + vp, 3, function (data) {
            // コメント入力欄を有効にする
            comeInput.disabled = false;
            // コメントリスト配列に投稿したコメントを追加
            comments.push(newCome);
            // コメント入力欄を空にする
            comeInput.value = "";
            // コメントリストにソート列がある場合はソートを行う。
            // TODO
            // 一番下に追加したほうがいいかもしれない
            var sortCols = comeListGrid.getSortColumns();
            if (sortCols.length > 0) {
                commentsSort(sortCol[0].columnId, sortCol[0].sortAsc);
            }
            comeListGridDataBind();
        });
    }
}

// コメント表示切り替えボタンクリックイベントハンドラ関数
function btnComeDisplayClick(e){
    // ローカルストレージおよびグローバル変数に保存
    localStorage.isComeDisplay = isComeDisplay = !isComeDisplay;
    // class(画像)を切り替え
    btnComeDisplay.className = isComeDisplay ? "comeDisplay" : "comeNoDisplay";
    // コメントの表示を切り替える
    comeLayer.style.visibility = isComeDisplay ? "" : "hidden";
    // コメントを表示するに設定された場合はコメント表示ループ処理を行う★
    if (player.getCurrentTime) step();
}

// ポップアウトプレイヤーリサイズイベントハンドラ関数
function popOutResize(e) {
    if (!isResizing) { // リサイズスタートの場合
        // 再生中の場合は動画を一時停止する。
        if (isPlaying) {
            player.pauseVideo();
        }
        // リサイズ中フラグをセット
        isResizing = true;
    }

    var pcW = playerContainer.style.offsetWidth, pcH = playerContainer.style.offsetHiehgt;
    var calcW = pcH * aspectRatio;

    // コメントレイヤーのサイズを再設定
    comeLayer.style.width = layerWidth = calcW;
    comeLayer.style.height = pcH;
    // 行の高さ及びフォントサイズを再計算
    rowHeight = Math.floor(pcH / rowCount);
    fontSize = rowHeight - 2;
    // コメント表示幅取得用エレメントに最計算したフォントサイズを適用
    measure.style.fontSize = fontSize + "px";
    var comeElements = comeLayer.childNodes;
    for (var cei = 0, cel = comeElements.length; cei < cel; cei++) {
        var comeElmemnt = comeElements[cei];
        // フォントサイズを変更
        comeElmemnt.style.fontSize = fontSize + "px";
        // コメント幅を再取得
        measure.textContent = comeElmemnt.textContent;
        var come = comments[+come.getAttribute("id")];
        come.messageWidth = measure.offsetWidth;
        // コメントの位置を再設定
        come.style.left = (layerWidth - (come.messageWidth + layerWidth) * onTime / onTimeDuration) + "px";
    }

    // リサイズ終了をチェック
    if (resizedID) {
        clearTimeout(resizedID);
        resizedID = null;
    }
    resizedID = setTimeout(function () {
        // リサイズ中フラグをリセット
        isPlaying = false;
        // 改めて全てのコメントの幅を再取得
        for (var ci = 0, cl = comments.length; ci < cl; ci++) {
            var come = comments[ci];
            measure.textContent = come.body;
            come.messageWidth = measure.offsetWidth;
        }
        // 動画の再生を再開
        if (isPlaying) {
            player.playVideo();
        }
    }, 500);
}

// flashvarsを展開
function getFlashVars(player){
    var flashvars = player.getAttribute("flashvars");
    var vars = flashvars.split("&");
    var res = {}
    for (var vi = 0; vi < vars.length; vi++) {
        var kvp = vars[vi].split("=");
        var varName = kvp[0];
        kvp.shift();
		res[varName] = kvp.join("=");
	}
    return res;
}

// シリアライズバイナリーデータからcontentIDの値を抽出
function getContentIDValue(decData) {
    for (var ddi = 0, ddl = decData.length; ddi < ddl; ddi++) {
        if (
                decData[ddi] == 0x63 &&     // c
                decData[ddi + 1] == 0x6F && // o
                decData[ddi + 2] == 0x6E && // n
                decData[ddi + 3] == 0x74 && // t
                decData[ddi + 4] == 0x65 && // e
                decData[ddi + 5] == 0x6E && // n
                decData[ddi + 6] == 0x74 && // t
                decData[ddi + 7] == 0x49 && // I
                decData[ddi + 8] == 0x44) { // D
            var cidValOffset = ddi + 10;
            var val = 0, res = 0; bCnt = 0;
            do {
                val = decData[cidValOffset];
                cidValOffset++;
                bCnt++;
                if (bCnt == 5) break;
                if (bCnt < 4) {
                    res = (res << 7) + (val & 0x7F);
                } else {
                    res = (res << 8) + val;
                }
            } while ((val & 0x80) != 0);
            return res;
            break;
        }
    }
    return 0;
}

function getComment() {
    xhrfunc("GET", comeServer + ".json?movie_id=" + contentID, null, -1, function (res) {
        comments = JSON.parse(res);
        // コメント配列初期処理実行
        initComments();
        if (!isPopOutPlayer) {
            // コメントリストのセットアップ及びコメントリストを表示
            // ローカルストレージに保存していたソート状態またはデフォルトのソート状態でソートを行う
            // ただし、自動スクロールフラグがセットされている場合は"位置"(かつAsc)でソートする。
            comeListGrid.setSortColumn(isAutoScroll ? "position" : sortCol, isAutoScroll ? true : sortAsc);
            commentsSort(isAutoScroll ? "position" : sortCol, isAutoScroll ? true : sortAsc);
            comeListGridDataBind();
        }
        // フレームループ開始★
        if (player.getCurrentTime) step();
    });
}

// XHR処理
function xhrfunc(method, uri, sendData, retryCnt, callback) {
    var xhr = new XMLHttpRequest();
    xhr.onload = function () { callback(xhr.responseText) };
    xhr.onerror = function (e) {
        var rc = retryCnt > 0 ? retryCnt - 1 : retryCnt;
        if (rc > 0) xhrfunc(method, uri, sendData, callback, rc);
    }
    xhr.open(method, uri, true);
    if (method == "POST") xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    xhr.send(sendData);
}

// コメントリストグリッド初期化処理
function initComeListGrid() {
    var options = {
        editable: true,
        enableCellNavigation: true,
        asyncEditorLoading: false,
        autoEdit: false
    };
    var columns = [];
    columns.push({ id: "position", name: "位置", field: "position", width: 45, formatter: Slick.Formatters.Position, sortable: true });
    columns.push({ id: "body", name: "コメント", field: "body", width: 100, sortable: true });
    columns.push({ id: "updated_at", name: "書込日時", field: "updated_at", width: 70, formatter: Slick.Formatters.Date, sortable: true });
    comeListGrid = new Slick.Grid("#comeList", [], columns, options);
    comeListGrid.setSelectionModel(new Slick.RowSelectionModel({}));
    comeListGrid.onDblClick.subscribe(function (e, args) {
        // ダブルクリックしたら再生位置をその位置にする
        // プレイヤーのseekVideoメソッドの引数は秒単位
        var cell = comeListGrid.getCellFromEvent(e);
        var row = cell.row;
        var seekPos = Math.floor(comments[row].position / 1000);
        // 最低1秒前にシークする
        player.seekVideo(seekPos - 1);
    });
    comeListGrid.onSort.subscribe(function (e, args) {
        var field = args.sortCol.field;
        // グローバール変数およびローカルストレージにソート状態を保存
        localStorage.sortCol = sortCol = field;
        localStorage.sortAsc = args.sortAsc;
        commentsSort(field, args.sortAsc);
        comeListGridDataBind();
    });

    // ヘッダークリック禁止用マスクレイヤーの作成
    var header = document.getElementsByClassName("slick-header")[0];
    headerClickMask = document.createElement("div");
    headerClickMask.setAttribute("id", "headerClickMask");
    headerClickMask.style.position = "absolute";
    headerClickMask.style.left = headerClickMask.style.top = 0 + "px";
    headerClickMask.style.width = header.offsetWidth + "px";
    headerClickMask.style.height = header.offsetHeight + "px";
    headerClickMask.style.display = isAutoScroll ? "" : "none";
    comeList.appendChild(headerClickMask);
}

// コメントリストグリッドデータバインド処理
function comeListGridDataBind() {
    comeListGrid.setData(comments);
    comeListGrid.updateRowCount();
    comeListGrid.render();
}

// コメント配列初期処理
function initComments() {
    // コメント切捨て
    // 無料視聴の場合は、動画の長さが１分30秒となりこれを元にコメント数を計算し取得すると、
    // "位置"でソートされていない場合はパラパラなものとなるため、
    // いったん"位置"でソートを行なってから切り捨てる。
    // TODO
    // 現在はすべて取得後、クライアントで最新x件以前のものを切り捨てる。
    // これをサーバーからコメント取得時にパラメーターを渡して行うようにする。
    if (userID == "-1") commentsSort("position", true);
    var comeCntInDuration = thirtyMinComeCount * movieDuration / 1800000;
    if (comments.length > comeCntInDuration) {
        comments.splice(comeCntInDuration, comments.length - comeCntInDuration);
    }
    for (var ci = 0, cl = comments.length; ci < cl; ci++) {
        // 日付文字列を数値に(ミリ秒)
        var come = comments[ci];
        come.updated_at = +new Date(comments[ci].updated_at);
        come.flag = false;
        come.element = null;
        // コメント表示幅を取得
        measure.textContent = come.body;
        come.messageWidth = measure.offsetWidth;
    }
}

function commentsSort(field, asc) {
    comments.sort(function (a, b) {
        var result = a[field] > b[field] ? 1 : a[field] < b[field] ? -1 : 0;
        return asc ? result : -result;
    });
}


// フレームループ関数
function step() {
    if (player.getCurrentTime) {
        // プレイヤーのcurrentTimeを取得
        var currentTime = player.getCurrentTime();
        // 再生中チェックフラグ
        var playingCheck = !isPopOutPlayer || (isPopOutPlayer && !isResizing);

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
                for (var ci = 0, l = comments.length; ci < l; ci++) {
                    comments[ci].element = null;
                    comments[ci].flag = null;
                }
                for (var ri = 0; ri < rowCount; ri++) {
                    rowRightCome[ri] = null;
                }
                if (playingCheck) {
                    isPlaying = false;
                    playingState = 0;
                }
            } else if (previousTime < currentTime) {
                if (playingCheck) {
                    // 4回チェックを行い、4回ともにcurrentTimeがpreviousTimeより大きい場合は、
                    // 再生中と判断する。
                    playingState++;
                    //isPlaying = (playingState >= 4);
                }
            } else {
                if (playingCheck) {
                    isPlaying = false;
                    playingState = 0;
                }
            }

            if (playingCheck) {
                // コメントを表示
                render(currentTime);
            }
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
                comeElement.style.position = "absolute";
                comeElement.className = "come";
                comeElement.textContent = come.body;
                comeElement.setAttribute("id", ci);
                comeElement.style.left = comeLeft + "px";
                // コメントの表示位置(行)を設定
                comeElement.style.top = (ri * rowHeight) + "px";
                comeElement.style.fontSize = fontSize + "px";
                comeLayer.appendChild(comeElement);
                // 行最右コメント更新
                rowRightCome[ri] = come;
                come.flag = true;
                come.element = comeElement;
                come.right = comeRight;

                // 自動スクロールに設定している場合は、
                // コメントリストのスクロールを行う
                if (isAutoScroll) {
                    comeListGrid.setSelectedRows([ci]);
                    comeListGrid.scrollRowIntoView(ci);
                }
            }
        }
    }
}

// コメントを追加できる行を検索。
// あればその行のインデックスを返し、無ければ-1を返す
function searchCanAddeRowIndex(come) {
    for (var ri = 0; ri < rowCount; ri++) {
        if (rowRightCome[ri] != null) { // その行にコメントがある場合
            var prevCome = rowRightCome[ri];
            if (come.right > 0) continue;
            // 同じ行に短いコメントのあとに長いコメントが続くと
            // 短いコメントと長いコメントが重なってしまう場合があるので
            // 重なるか判定を行う

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

