// ポップアウトプレイヤーのチェック
var isPopOutPlayer = (document.location.href.indexOf("stand_alone") != -1);

// --------------------------------
// 定数
// --------------------------------
// 動画の長さが30分の場合でのコメント取得数
var thirtyMinComeCount = 2000;
// コメントの最大文字数
var comeMaxLength = 60;
// コメント行の行数
var rowCount = 20;
// コメントが画面の右端から左端まで移動する時間(単位:ミリ秒)
var onTimeDuration = 5000;
// コメントリストの幅
var comeListWidth = 400;
// コメントリストコンテナーの幅
var comeListContainerWidth = comeListWidth + 17;
// コメントサーバーURL
var comeServer = "http://huludouga.heroku.com/comments";

// --------------------------------
// 変数
// --------------------------------
// プレイヤーの幅
var playerWidth = 0;
// プレイヤーの高さ
var playerHeight = 0;
// コメントのフォントサイズ
var fontSize = 0;
// コメント行の高さ
var rowHeight = 0;
// ポップアウトプレイヤーリサイズ中フラグ
var isResizing = false;
// 各行の一番右にあるコメントを保持する配列
var rowRightCome = new Array(rowCount);
for (var ri = 0; ri < rowCount; ri++) {
    // 行最右コメントNo配列初期化
    rowRightCome[ri] = null;
}
// 前のフレームのcurrentTimeを保持する
// プレイヤーからは再生中かどうかを取得する方法がわからなかったため、
// 前のcurrentTimeと比較して違う場合は再生中と判断する。
// ※このため、一時停止中にシークした場合でも再生中と判断してしまう。
var previousTime = 0;
// アスペクト比
var aspectRatio = 0;
// 動画の長さ
var movieDuration = 0;
// コンテンツID
var contentID = null;
// リサイズ終了チェックタイムアウトID
var resizeEndID = null;
// コメント配列(JSON.parseで配列として取得)
var comments = [];
// 再生中フラグ
// プレイヤーからは再生中かどうかを取得することができないため
// ループ時にこちらで再生中かどうかをチェックする
var isPlaying = false;
var playingState = 0;
var pausingState = 0;
// 現在表示しているグリッド
var currentGrid = null;
// 現在表示しているグリッドのデータ
var currentList = comments;


// --------------------------------
// エレメント用変数
// --------------------------------
// コメント表示用オーバレイレイヤー
var comeLayer = null;
// コメントリストコンテナー
var comeListContainer = null;
// NGユーザーリストコンテナー
var ngUserListContainer = null;
// NGコメントリストコンテナー
var ngComeListContainer = null;
// コメントリスト(エレメント)
var comeList = null;
// NGユーザーリスト(エレメント)
var ngUserList = null;
// NGコメントリスト(エレメント)
var ngComeList = null;
// コメントリストグリッド
var comeListGrid = null;
// NGユーザーリストグリッド
var ngUserListGrid = null;
// NGコメントリストグリッド
var ngComeListGrid = null;
// ヘッダークリック禁止マスク
var headerClickMask = null;
// コメントリストグリッド用コンテキストメニューの「…をNGユーザーに追加する」メニューアイテム
var clContextAddNgUserMenuItem = null;
// コメントリストグリッド用コンテキストメニューの「…をNGコメントに追加する」メニューアイテム
var clContextAddNgComeMenuItem = null;
// コメントリストグリッド用コンテキストメニューの「…をコピーする」メニューアイテム
var clContextCopyMenuItem = null;

// デバッグ用span
var debugSpan = null;

// --------------------------------
// 永続化される設定情報取得
// --------------------------------
// ※ローカルストレージではboolean型は文字列で保存されるため
// 取得時は x = val == "true" などで取得
// ユーザーIDはポップアウトプレイヤー用に使用するため
// この時点でローカルストレージからの取得は行わない。
var isComeDisplay = localStorage.isComeDisplay ? localStorage.isComeDisplay == "true" : true;
var isAutoScroll = localStorage.isAutoScroll ? localStorage.isAutoScroll == "true" : false;
var comeListSortCol = localStorage.comeListSortCol ? localStorage.comeListSortCol : "updated_at";
var comeListSortAsc = localStorage.comeListSortAsc ? localStorage.comeListSortAsc : true;
var ngUserListSortCol = localStorage.ngUserListSortCol ? localStorage.ngUserListSortCol : "userID";
var ngUserListSortAsc = localStorage.ngUserListSortAsc ? localStorage.ngUserListSortAsc : true;
var ngComeListSortCol = localStorage.ngComeListSortCol ? localStorage.ngComeListSortCol : "body";
var ngComeListSortAsc = localStorage.ngComeListSortAsc ? localStorage.ngComeListSortAsc : true;
var ngUsers = localStorage.ngUsers ? JSON.parse(localStorage.ngUsers) : [];
var ngComments = localStorage.ngComments ? JSON.parse(localStorage.ngComments) : [];

// --------------------------------
// DOM構築直後に行う処理
// --------------------------------
// ポップアウトプレイヤーかどうかチェック
var isPopOutPlayer = (document.location.href.indexOf("stand_alone") != -1);
//フラッシュプレイヤーがロードされる前に!?wmodeを適用したものに置き換える
// プレイヤーコンテナーを取得
var playerContainer = document.getElementById(isPopOutPlayer ? "v" : "player-container");
// プレイヤーを取得
var player = document.getElementById("player");
// プレイヤーにwmode("opaque")を追加
player.setAttribute("wmode", "opaque");
player.setAttribute("popout", "true");
// プレイヤーをフルスクリーンコンテナーに移動するとともにwmodeを適応
playerContainer.removeChild(player);
playerContainer.appendChild(player);

// コメント表示幅を計測するためのエレメントを作成
var measure = document.createElement("span");
measure.setAttribute("id", "measure");
measure.style.visibility = "hidden";
document.body.appendChild(measure);


// ロードイベント
window.addEventListener("load", function () {
    /*for (var ngui = 0; ngui < 100; ngui++) {
        var ngu = {};
        ngu.ngUserID = ""+ngui;
        ngUsers.push(ngu);
    }
    for (var ngci = 0; ngci < 100; ngci++) {
        var ngc = {};
        ngc.ngBody = ""+ngci;
        ngComments.push(ngc);
    }*/
    // 動画の長さを取得する
    getDuration();

});

// 動画の長さを取得
// 取得できるまでには多少のラグが必要なので
// タイムアウトで繰り返しチェックして取得する
function getDuration() {
    if (player.getDuration && player.getDuration()) {
        movieDuration = player.getDuration();

        // プレイヤーの情報
        getPlayerInfo();
    } else {
        setTimeout(getDuration, 50);
    }
}

// プレイヤーの情報を取得
// こちらも念のためタイムアウトを使って取得
function getPlayerInfo() {
    if (isPopOutPlayer) {
        if (playerContainer.offsetWidth) {
            playerWidth = playerContainer.offsetWidth;
            playerHeight = playerContainer.offsetHeight;
        } else {
            setTimeout(getPlayerInfo, 50);
            return;
        }
    } else {
        if (playerContainer.style.width) {
            playerWidth = parseInt(playerContainer.style.width);
            playerHeight = parseInt(playerContainer.style.height);
            player.style.width = "100%";
            player.style.height = "100%";
        } else {
            setTimeout(getPlayerInfo, 50);
            return;
        }
    }
    rowHeight = Math.floor(playerHeight / 20);
    fontSize = rowHeight - 2;
    measure.style.fontSize = fontSize + "px";

    // UIエレメント作成
    createElement();
}

// UIエレメント作成
function createElement() {
    
    // UI構築
    if (isPopOutPlayer) {
        createElementForPopOutPlayer();
    } else {
        createElementForPagePlayer();
    }

    // コメントをサーバーより取得
    getComment();
}

// ページプレイヤー用のUI構築
function createElementForPagePlayer() {

    // flashvarsを連想配列に展開
    var flashvars = getFlashVars(player);
    // コンテンツIDの取得
    contentID = flashvars.content_id;
    // ユーザーIDをグローバル変数及びローカルストレージに保存
    localStorage.userID = userID = flashvars.user_id;
    // コメント表示用オーバレイレイヤーの作成
    comeLayer = document.createElement("div");
    comeLayer.setAttribute("id", "comeLayer");
    comeLayer.style.width = playerWidth + "px";
    comeLayer.style.height = playerHeight + "px";
    comeLayer.style.visibility = isComeDisplay ? "" : "hidden";
    comeLayer.style.position = "absolute";
    comeLayer.style.left = player.offsetLeft + "px";
    comeLayer.style.top = player.offsetTop + "px";
    playerContainer.appendChild(comeLayer);
    
    // コメントリストコンテナの作成
    comeListContainer = document.createElement("div");
    comeListContainer.setAttribute("id", "comeListContainer");
    comeListContainer.style.position = "absolute";
    comeListContainer.style.width = comeListContainerWidth + "px";
    comeListContainer.style.height = (playerHeight - 20) + "px";
    comeListContainer.style.top = playerContainer.style.paddingTop;
    comeListContainer.style.left = (parseInt(playerContainer.style.paddingLeft) + playerWidth + 10) + "px";
    comeListContainer.style.backgroundColor = "white";
    playerContainer.appendChild(comeListContainer);
    // コメントリスト用エレメントの作成
    comeList = document.createElement("div");
    comeList.setAttribute("id", "comeList");
    comeList.style.width = comeListContainerWidth + "px";
    comeList.style.height = (playerHeight - 20) + "px";
    comeListContainer.appendChild(comeList);
    // コメントリストグリッド初期化
    var comeColumns = [];
    comeColumns.push({ id: "position", name: "位置", field: "position", width: 60, formatter: Slick.Formatters.Position, sortable: true });
    comeColumns.push({ id: "body", name: "コメント", field: "body", width: 270, formatter: Slick.Formatters.Comment, sortable: true });
    comeColumns.push({ id: "updated_at", name: "書込日時", field: "updated_at", width: 70, formatter: Slick.Formatters.Date, sortable: true });
    comeListGrid = initGrid("#comeList", comments, comeColumns);
    comeListGrid.onDblClick.subscribe(function (e, args) {
        // ダブルクリックしたら再生位置をその位置にする
        // プレイヤーのseekVideoメソッドの引数は秒単位
        var cell = comeListGrid.getCellFromEvent(e);
        var row = cell.row;
        var seekPos = Math.floor(comments[row].position / 1000);
        // 最低1秒前にシークする
        player.seekVideo(seekPos - 1);
    });
    comeListGrid.onContextMenu.subscribe(showContextMenu);
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

    // NGユーザーリストコンテナの作成
    ngUserListContainer = document.createElement("div");
    ngUserListContainer.setAttribute("id", "ngUserListContainer");
    ngUserListContainer.style.position = "absolute";
    ngUserListContainer.style.width = comeListContainerWidth + "px";
    ngUserListContainer.style.height = (playerHeight - 30) + "px";
    ngUserListContainer.style.top = playerContainer.style.paddingTop;
    ngUserListContainer.style.left = (parseInt(playerContainer.style.paddingLeft) + playerWidth + 10) + "px";
    ngUserListContainer.style.backgroundColor = "white";
    playerContainer.appendChild(ngUserListContainer);
    // コメントリスト用エレメントの作成
    ngUserList = document.createElement("div");
    ngUserList.setAttribute("id", "ngUserList");
    ngUserList.style.width = comeListContainerWidth + "px";
    ngUserList.style.height = (playerHeight - 30) + "px";
    ngUserListContainer.appendChild(ngUserList);
    // コメントリストグリッド初期化
    var ngUserColumns = [];
    ngUserColumns.push({ id: "ngUserID", name: "NGユーザー", field: "ngUserID", width: 330, sortable: true });
    ngUserColumns.push({ id: "ngUserAddDate", name: "追加日時", field: "addDate", width: 70, formatter: Slick.Formatters.Date, sortable: true });
    ngUserListGrid = initGrid("#ngUserList", ngUsers, ngUserColumns);
    ngUserListGrid.onContextMenu.subscribe(showContextMenu);

    // NGコメントリストコンテナの作成
    ngComeListContainer = document.createElement("div");
    ngComeListContainer.setAttribute("id", "ngComeListContainer");
    ngComeListContainer.style.position = "absolute";
    ngComeListContainer.style.width = comeListContainerWidth + "px";
    ngComeListContainer.style.height = (playerHeight - 30) + "px";
    ngComeListContainer.style.top = playerContainer.style.paddingTop;
    ngComeListContainer.style.left = (parseInt(playerContainer.style.paddingLeft) + playerWidth + 10) + "px";
    ngComeListContainer.style.backgroundColor = "white";
    playerContainer.appendChild(ngComeListContainer);
    // コメントリスト用エレメントの作成
    ngComeList = document.createElement("div");
    ngComeList.setAttribute("id", "ngComeList");
    ngComeList.style.width = comeListContainerWidth + "px";
    ngComeList.style.height = (playerHeight - 30) + "px";
    ngComeListContainer.appendChild(ngComeList);
    // コメントリストグリッド初期化
    var ngComeColumns = [];
    ngComeColumns.push({ id: "ngBody", name: "NGコメント", field: "ngBody", width: 330, sortable: true });
    ngComeColumns.push({ id: "ngComeAddDate", name: "追加日時", field: "addDate", width: 70, formatter: Slick.Formatters.Date, sortable: true });
    ngComeListGrid = initGrid("#ngComeList", ngComments, ngComeColumns);
    ngComeListGrid.onContextMenu.subscribe(showContextMenu);

    // 自動スクロールチェックボックスの作成
    var cbAutoScroll = document.createElement("input");
    cbAutoScroll.setAttribute("type", "checkbox");
    cbAutoScroll.setAttribute("id", "cbAutoScroll");
    cbAutoScroll.checked = isAutoScroll;
    cbAutoScroll.style.marginTop = "4px";
    comeListContainer.appendChild(cbAutoScroll);
    cbAutoScroll.addEventListener("click", cbAutoScrollClick, false);
    // 自動スクロールチェックボックス用ラベルの作成
    var lblAutoScroll = document.createElement("label");
    lblAutoScroll.setAttribute("id", "lblAutoScroll");
    lblAutoScroll.setAttribute("for", "cbAutoScroll");
    lblAutoScroll.textContent = "自動スクロールする";
    lblAutoScroll.style.marginTop = "4px";
    comeListContainer.appendChild(lblAutoScroll);

    // NGユーザー手入力登録用テキストボックスの作成
    var tbAddNgUser = document.createElement("input");
    tbAddNgUser.setAttribute("type", "textbox");
    tbAddNgUser.setAttribute("id", "tbAddNgUser");
    tbAddNgUser.style.height = "20px";
    tbAddNgUser.style.width = (comeListContainerWidth - 4) + "px";
    tbAddNgUser.style.display = "inline-block";
    tbAddNgUser.style.float = "left";
    tbAddNgUser.style.fontSize = "9pt";
    tbAddNgUser.style.marginTop = "4px";
    ngUserListContainer.appendChild(tbAddNgUser);
    tbAddNgUser.addEventListener("keydown", function (e) {
        if (e.keyCode == 13) {
            var ngUserID = tbAddNgUser.value.replace(/^[\s　]+|[\s　]+$/g, '');
            // 未入力または空白のみの場合はコメントの登録を行わない
            if (ngUserID == "") return;
            // 50文字でカットする
            if (ngUserID.length > 50) {
                ngUserID = ngUserID.substr(0, 50);
            }
            tbAddNgUser.value = "";
            addNgUser(ngUserID);
        }
    });
    
    // NGコメント手入力登録用テキストボックスの作成
    var tbAddNgCome = document.createElement("input");
    tbAddNgCome.setAttribute("type", "textbox");
    tbAddNgCome.setAttribute("id", "tbAddNgCome");
    tbAddNgCome.style.height = "20px";
    tbAddNgCome.style.width = (comeListContainerWidth - 4) + "px";
    tbAddNgCome.style.display = "inline-block";
    tbAddNgCome.style.float = "left";
    tbAddNgCome.style.fontSize = "9pt";
    tbAddNgCome.style.marginTop = "4px";
    ngComeListContainer.appendChild(tbAddNgCome);
    tbAddNgCome.addEventListener("keydown", function (e) {
        if (e.keyCode == 13) {
            var ngCome = tbAddNgCome.value.replace(/^[\s　]+|[\s　]+$/g, '');
            // 未入力または空白のみの場合はコメントの登録を行わない
            if (ngCome == "") return;
            // コメント最大文字数で文字でカットする
            if (ngCome.length > comeMaxLength) {
                ngUserID = ngUserID.substr(0, comeMaxLength);
            }
            tbAddNgCome.value = "";
            addNgCome(ngCome);
        }
    });

    // コントロールパネルの作成
    var controlPanel = document.createElement("div");
    controlPanel.setAttribute("id", "comeControlPanel");
    controlPanel.style.width = playerWidth + "px";
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


    // btnComeList
    var btnComeList = document.createElement("div");
    btnComeList.setAttribute("id", "btnComeList");
    btnComeList.setAttribute("title", "コメント");
    btnComeList.className = isComeDisplay ? "comeDisplay" : "comeNoDisplay";
    controlPanel.appendChild(btnComeList);
    btnComeList.addEventListener("click", function () {
        comeListContainer.style.visibility = "";
        ngUserListContainer.style.visibility = "hidden";
        ngComeListContainer.style.visibility = "hidden";
        currentGrid = comeListGrid;
        currentList = comments;
    }, false);
    // btnNgUserList
    var btnNgUserList = document.createElement("div");
    btnNgUserList.setAttribute("id", "btnNgUserList");
    btnNgUserList.setAttribute("title", "NGユーザー");
    btnNgUserList.className = isComeDisplay ? "comeDisplay" : "comeNoDisplay";
    controlPanel.appendChild(btnNgUserList);
    btnNgUserList.addEventListener("click", function () {
        comeListContainer.style.visibility = "hidden";
        ngUserListContainer.style.visibility = "";
        ngComeListContainer.style.visibility = "hidden";
        currentGrid = ngUserListGrid;
        currentList = ngUsers;
    }, false);
    // btnNgComeList
    var btnNgComeList = document.createElement("div");
    btnNgComeList.setAttribute("id", "btnNgComeList");
    btnNgComeList.setAttribute("title", "NGコメント");
    btnNgComeList.className = isComeDisplay ? "comeDisplay" : "comeNoDisplay";
    controlPanel.appendChild(btnNgComeList);
    btnNgComeList.addEventListener("click", function () {
        comeListContainer.style.visibility = "hidden";
        ngUserListContainer.style.visibility = "hidden";
        ngComeListContainer.style.visibility = "";
        currentGrid = ngComeListGrid;
        currentList = ngComments;
    }, false);
    comeListContainer.style.visibility = "";
    ngUserListContainer.style.visibility = "hidden";
    ngComeListContainer.style.visibility = "hidden";
    currentGrid = comeListGrid;

    debugSpan = document.createElement("span");
    debugSpan.style.width = "100px";
    debugSpan.style.display = "inline-block";
    debugSpan.style.float = "left";
    debugSpan.style.color = "white";
    controlPanel.appendChild(debugSpan);

    // コメントリストグリッド用コンテキストメニューの作成
    var clContextMenu = document.createElement("ul");
    clContextMenu.setAttribute("id", "clContextMenu");
    clContextMenu.style.display = "none";
    clContextMenu.style.position = "absolute";
    clContextAddNgUserMenuItem = document.createElement("li");
    clContextMenu.appendChild(clContextAddNgUserMenuItem);
    clContextAddNgUserMenuItem.addEventListener("click", function () {
        addNgUser(this.getAttribute("data"));
    });
    clContextAddNgComeMenuItem = document.createElement("li");
    clContextMenu.appendChild(clContextAddNgComeMenuItem);
    clContextAddNgComeMenuItem.addEventListener("click", function () {
        addNgCome(this.getAttribute("data"));
    });
    clContextCopyMenuItem = document.createElement("li");
    clContextMenu.appendChild(clContextCopyMenuItem);
    clContextCopyMenuItem.addEventListener("click", function () {
        var comment = this.getAttribute("data");
        $.clipboard(comment);
    });
    document.body.appendChild(clContextMenu);
   

    // NGリスト編集用コンテキストメニューの作成
    var ngContextMenu = document.createElement("ul");
    ngContextMenu.setAttribute("id", "ngContextMenu");
    ngContextMenu.style.display = "none";
    ngContextMenu.style.position = "absolute";
    var ngContextMenuItem = document.createElement("li");
    ngContextMenuItem.textContent = "削除"
    ngContextMenu.appendChild(ngContextMenuItem);
    document.body.appendChild(ngContextMenu);
    $("#ngContextMenu").click(function (e) {
        if (!$(e.target).is("li")) return;
        var row = $(this).data("row");
        currentList.splice(row, 1);
        gridDataBind(currentGrid, currentList);
        commentsSetNG();
        gridDataBind(comeListGrid, comments);
    });
}

// ポップアウトプレイヤー用UI構築
function createElementForPopOutPlayer() {
   
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
    // コメント幅取得用エレメントにフォントサイズを適用
    measure.style.fontSize = fontSize + "px";

    window.addEventListener("resize", function () {
        if (playerWidth != playerContainer.offsetWidth) {
            playerWidth = playerContainer.offsetWidth;
        }
        if (playerHeight != playerContainer.offsetHeight) {
            playerHeight = playerContainer.offsetHeight;
            rowHeight = playerHeight / rowCount;
            fontSize = rowHeight - 2;
            measure.style.fontSize = fontSize + "px";
            var comeElements = comeLayer.childNodes;
            /*for (var cei = 0, cel = comeElements.length; cei < cel; cei++) {
                cei.style.fontSize = fontSize + "px";
            }*/
            for (var ci = 0, cl = comments.length; ci < cl; ci++) {
                comments.messageWidth = measure.offsetWidth;
            }
        }
    });
}

// 自動スクロールチェックボックスクリックイベントハンドラ関数
function cbAutoScrollClick(e) {
    // ローカルストレージ及びグローバル変数に自動スクロールフラグを保存
    localStorage.isAutoScroll = isAutoScroll = cbAutoScroll.checked;
    if (cbAutoScroll.checked) { // 自動スクロールチェックボックスにチェックを入れた場合
        var sortCols = comeListGrid.getSortColumns();
        if (sortCols.length == 0) { // ソートされていない場合
            comeListSortCol = null;
        } else { // ソートされている場合
            // 現在のソート状態を保持
            comeListSortCol = sortCols[0].columnId;
            comeListSortAsc = sortCols[0].sortAsc;
        }
        // コメントリストを"位置"でソートする。
        comeListGrid.setSortColumns("position", true);
        dataSort(comments, "position", true);
        gridDataBind(comeListGrid, comments);
        headerClickMask.style.display = "";
    } else { // 自動スクロールチェックボックスにチェックをはずした場合
        if (comeListSortCol) { // 自動スクロール前のソート状態が保持されている場合
            // 自動スクロール前のソートに戻す。
            comeListGrid.setSortColumn(comeListSortCol, comeListSortAsc);
            dataSort(comments, comeListSortCol, comeListSortAsc);
            gridDataBind(comeListGrid, comments);
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
                dataSort(comments, sortCols[0].columnId, sortCols[0].sortAsc);
            }
            gridDataBind(comeListGrid, comments);
        });
    }
}

// コンテキストメニューイベントハンドラ関数
function showContextMenu(e) {
    e.preventDefault();
    var row = currentGrid.getCellFromEvent(e).row;
    if (currentGrid == comeListGrid) {
        $("#clContextMenu")
          .css("top", e.pageY)
          .css("left", e.pageX)
          .show();
    } else {
        $("#ngContextMenu")
          .data("row", row)
          .css("top", e.pageY)
          .css("left", e.pageX)
          .show();
    }
    currentGrid.setSelectedRows([row]);
    if (currentGrid == comeListGrid) {
        var come = comments[row].body;
        if (come.length > 10) {
            come = come.substr(0, 10) + "…";
        }
        clContextAddNgUserMenuItem.textContent = come + " をNGユーザーに追加";
        clContextAddNgUserMenuItem.setAttribute("data", comments[row].userID);
        clContextAddNgComeMenuItem.textContent = come + " をNGコメントに追加";
        clContextAddNgComeMenuItem.setAttribute("data", comments[row].body.replace(/^[\s　]+|[\s　]+$/g, ''));
        clContextCopyMenuItem.textContent = come + " をコピー";
        clContextCopyMenuItem.setAttribute("data", comments[row].body);
    }
    $("body").one("click", function () {
        if (currentGrid == comeListGrid) {
            $("#clContextMenu").hide();
        } else {
            $("#ngContextMenu").hide();
        }
    });
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

// フルスクリーン切り替えボタンクリックイベントハンドラ関数
function btnFullScreenClick(e) {
    //fullScreenContainer.webkitRequestFullScreen();
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

// コメントをサーバーから取得
function getComment() {
    xhrfunc("GET", comeServer + ".json?movie_id=" + contentID, null, -1, function (res) {
        comments = JSON.parse(res);
        // コメント配列初期処理実行
        initComments();
        if (!isPopOutPlayer) {
            // コメントリストのセットアップ及びコメントリストを表示
            // ローカルストレージに保存していたソート状態またはデフォルトのソート状態でソートを行う
            // ただし、自動スクロールフラグがセットされている場合は"位置"(かつAsc)でソートする。
            dataSort(comments, isAutoScroll ? "position" : comeListSortCol, isAutoScroll ? true : comeListSortAsc);
            comeListGrid.setSortColumn(isAutoScroll ? "position" : comeListSortCol, isAutoScroll ? true : comeListSortAsc);
            gridDataBind(comeListGrid, comments);
        }
        // フレームループ開始★
        step();
    });
}

// XHR処理
function xhrfunc(method, uri, sendData, retryCnt, callback) {
    var xhr = new XMLHttpRequest();
    var success = false;
    xhr.onloadend = function () {
        if (!xhr.responseText) {
            setTimeout(xhrfunc(method, uri, sendData, retryCnt, callback), 3000);
        } else {
            if (method == "GET") {
                comments = JSON.parse(xhr.responseText);
                if (comments.length == 0) {
                    setTimeout(xhrfunc(method, uri, sendData, retryCnt, callback), 3000);
                    return;
                }
            }
            callback(xhr.responseText);
        }
    };
    xhr.open(method, uri, true);
    if (method == "POST") xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    xhr.send(sendData);
}
function xhrfuncRetry(method, uri, sendData, retryCnt, callback) {
    var rc = retryCnt > 0 ? retryCnt - 1 : retryCnt;
    if (rc > 0) xhrfunc(method, uri, sendData, callback, rc);
}

// グリッドオプション
var gridOptions = {
    editable: true,
    enableCellNavigation: true,
    asyncEditorLoading: false,
    autoEdit: false
};

// グリッド初期化
function initGrid(id, data, columns) {
    var grid = new Slick.Grid(id, data, columns, gridOptions);
    grid.setSelectionModel(new Slick.RowSelectionModel({}));
    grid.onSort.subscribe(function gridSort(e, args) {
        var grid = args.grid;
        var data = grid.getData();
        var field = args.sortCol.field;
        var asc = args.sortAsc;
        if (data == comments) {
            localStorage.comeListSortCol = comeListSortCol = field;
            localStorage.comeListSortAsc = comeListSortAsc = asc;
        } else if (data == ngUsers) {
            localStorage.ngUserListSortCol = ngUserListSortCol = field;
            localStorage.ngUserListSortAsc = ngUserListSortAsc = asc;
        } else if (data == ngComments) {
            localStorage.ngComeListSortCol = ngComeListSortCol = field;
            localStorage.ngComeListSortAsc = ngComeListSortAsc = asc;
        }
        dataSort(data, field, asc);
        gridDataBind(grid, data);
    });
    return grid;
}

// グリッドデータバインド処理
function gridDataBind(grid, data) {
    grid.setData(data);
    grid.updateRowCount();
    grid.render();
}

// データソート処理
function dataSort(data, field, asc) {
    data.sort(function (a, b) {
        var result = a[field] > b[field] ? 1 : a[field] < b[field] ? -1 : 0;
        return asc ? result : -result;
    });
}

// コメントリストグリッド初期化処理
/*function initComeListGrid() {
    var columns = [];
    columns.push({ id: "position", name: "位置", field: "position", width: 45, formatter: Slick.Formatters.Position, sortable: true });
    columns.push({ id: "body", name: "コメント", field: "body", width: 100, sortable: true });
    columns.push({ id: "updated_at", name: "書込日時", field: "updated_at", width: 70, formatter: Slick.Formatters.Date, sortable: true });
    comeListGrid = new Slick.Grid("#comeList", [], columns, gridOptions);
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
        localStorage.comeListSortCol = sortCol = field;
        localStorage.comeListSortAsc = args.sortAsc;
        commentsSort(field, args.sortAsc);
        gridDataBind(comeListGrid, comments);
    });

    
}*/

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
        come.userID = "test";
        // コメント表示幅を取得
        measure.textContent = come.body;
        come.messageWidth = measure.offsetWidth;
    }
    commentsSetNG();
}

// NGユーザー追加処理
function addNgUser(ngUserID) {
    var flg = true;
    for (var ngui = 0, ngul = ngUsers.length; ngui < ngul; ngui++) {
        if (ngUsers[ngui].ngUserID == ngUserID) {
            flg = false;
            break;
        }
    }
    if (flg) {
        dataSort(ngUsers, "addDate", true);
        var addData = {};
        addData.ngUserID = ngUserID;
        addData.addDate = +new Date();
        ngUsers.push(addData);
        if (ngUsers.length > 100) ngUsers.shift();
        dataSort(ngUsers, ngUserListSortCol, ngUserListSortAsc);
        localStorage.ngUsers = JSON.stringify(ngUsers);
        gridDataBind(ngUserListGrid, ngUsers);
        commentsSetNG();
        gridDataBind(comeListGrid, comments);
    }
}

// NGコメント追加処理
function addNgCome(ngBody) {
    var flg = true;
    for (var ngci = 0, ngcl = ngComments.length; ngci < ngcl; ngci++) {
        if (ngComments[ngci].ngBody == ngBody) {
            flg = false;
            break;
        }
    }
    if (flg) {
        dataSort(ngComments, "addDate", true);
        var addData = {};
        addData.ngBody = ngBody;
        addData.addDate = +new Date();
        ngComments.push(addData);
        if (ngComments.length > 100) ngComments.shift();
        dataSort(ngComments, ngComeListSortCol, ngComeListSortAsc);
        localStorage.ngComments = JSON.stringify(ngComments);
        gridDataBind(ngComeListGrid, ngComments);
        commentsSetNG();
        gridDataBind(comeListGrid, comments);
    }
}

// コメント配列NGフラグ設定処理
function commentsSetNG() {
    for (var ci = 0, cl = comments.length; ci < cl; ci++) {
        var come = comments[ci];
        come.ng = false;
        for (var ngui = 0, ngul = ngUsers.length; ngui < ngul; ngui++) {
            come.ng |= (come.userID == ngUsers[ngui].ngUserID);
        }
        for (var ngci = 0, ngcl = ngComments.length; ngci < ngcl; ngci++) {
            come.ng |= (come.body.indexOf(ngComments[ngci].ngBody) > -1);
        }
    }
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
            } else {
                if (playingCheck) {
                    // 4回チェックを行い、4回ともにcurrentTimeがpreviousTimeより大きい場合は、
                    // 再生中と判断する。
                    playingState++;
                    if (playingState >= 4) {
                        isPlaying = true;
                        playingState = 0;
                        pausingState = 0;
                    }
                }
            }
            // コメントを表示
            if (playingCheck) render(currentTime);
        } else {
            if (playingCheck) {
                // 4回チェックを行い、4回ともにcurrentTimeがpreviousTimeより大きい場合は、
                // 再生中と判断する。
                pausingState++;
                if (pausingState >= 4) {
                    isPlaying = false;
                    playingState = 0;
                    pausingState = 0;
                }
            }
        }
        //if(!isPopOutPlayer) debugSpan.textContent = isPlaying ? "再生中" : "停止中";

        // 前フレームcurrentTimeを更新
        previousTime = currentTime;
    }
    // 次のフレームをリクエスト(という日本語が正しいのかどうか…)
    if(isComeDisplay) webkitRequestAnimationFrame(step);
}


// コメント描画処理
// 適切な範囲内のコメだけでループして処理するいい方法が思いつかなかったため、
// 毎フレームごとに全コメループ処理
function render(currentTime) {
    for (var ci = 0, cl = comments.length; ci < cl; ci++) {
        var come = comments[ci];
        if (come.ng) continue;
        // 表示開始からの経過時間算出
        var onTime = currentTime - come.position;
        if (onTime > 0) { // 表示時間に達した場合
            // コメントエレメント表示位置計算
            var comeLeft = playerWidth - (come.messageWidth + playerWidth) * onTime / onTimeDuration;
            var comeRight = comeLeft + come.messageWidth;
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
            var zeroDuration = come.messageWidth / (playerWidth + come.messageWidth) * onTimeDuration;
            var prevComePosAtZeroDuration =  playerWidth + prevCome.messageWidth - (playerWidth + prevCome.messageWidth) * (zeroDuration + (come.position - prevCome.position)) / onTimeDuration;
            // 追加するコメントの左端到達時点での既存のコメントの右端位置を求める。
            //var prevComePos = playerWidth + prevCome.messageWidth - (prevCome.messageWidth + playerWidth) * ((come.position - prevCome.position) + playerWidth / (come.messageWidth + playerWidth) * onTimeDuration) / onTimeDuration;
            // 重なる幅が10px以内を許容範囲とする。
            if (prevComePosAtZeroDuration >= 10) continue;
        }
        return ri;
    }
    return -1;
}
function popOut(time, lcname, inPlaylist, collection_id, continuous_play_mode, continuous_play_on, continuous_play_sort) {
    console.log(lcname);
    //popOutWithCid(current_video_cid, time, lcname, inPlaylist, collection_id, continuous_play_mode, continuous_play_on, continuous_play_sort);
}

function popOutWithCid(cid, time, lcname, inPlaylist, collection_id, continuous_play_mode, continuous_play_on, continuous_play_sort) {
    var url = "/stand_alone/" + cid + "?", params = [];
    if (lcname) {
        params.push("lcname=" + lcname);
    }
    if (typeof (continuous_play_mode) != "undefined") {
        params.push("continuous_play_mode=" + continuous_play_mode);
    }
    if ((typeof (continuous_play_on) != "undefined") && (continuous_play_on == 1)) {
        params.push("continuous_play=on");
    }
    params.push("locale=" + locale_lang);
    try {
        continuous_play_sort = ContinuousPlay.getSort(); params.push("continuous_play_sort=" + continuous_play_sort);
    }
    catch (e) { }
    if (params.length > 0) {
        url += params.join('&');
    }
    if (inPlaylist) {
        url += "#in-playlist";
    } else if (time) {
        url += "#" + time;
    }
    var full = window.open(url, "stand_alone", "toolbar=0,status=0,resizable=1,scrollbars=0,width=512,height=288");
    if (full) {
        if (navigator.userAgent.indexOf("Chrome") == -1)
            full.moveTo(0, 0); full.focus();
    } else {
        if (!Prototype.Browser.IE) {
            var playerDiv = $('breakout-container');
            var minTop = playerDiv.cumulativeOffset().top + 200;
            alert("Oops - your browser may be blocking this pop-up. Please disable your pop-up blocker before continuing.");
        } else {
            alert("Oops - your browser may be blocking this pop-up. Please disable your pop-up blocker before continuing.");
        }
    }
}