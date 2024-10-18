function stopTrigger() {
  // 全てのトリガーを取得
  var triggers = ScriptApp.getProjectTriggers();
  
  // トリガーを一つずつ削除
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() == 'myFunction') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  Logger.log("Trigger for 'myFunction' has been stopped.");
}

function myFunction() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const totalRows = sheet.getLastRow(); // データの総行数を取得
  Logger.log("Total Rows: " + totalRows); // デバッグ用ログ

  const batchSize = 50; // 一度に処理する行数を50に設定
  let lastProcessedRow = PropertiesService.getScriptProperties().getProperty('lastProcessedRow');
  lastProcessedRow = lastProcessedRow ? parseInt(lastProcessedRow, 10) : 0; // 前回処理した行を取得、初回は0
  Logger.log("Last Processed Row: " + lastProcessedRow); // デバッグ用ログ

  // すべての行が処理されている場合、トリガーを停止
  if (lastProcessedRow >= totalRows) {
    Logger.log("すべてのデータが処理されました。処理を終了します。");
    PropertiesService.getScriptProperties().deleteProperty('lastProcessedRow');
    stopTrigger(); // トリガーを停止
    return; // 処理を終了
  }

  // バッチ処理（50行ずつ処理）
  for (let row = lastProcessedRow + 1; row <= totalRows && row <= lastProcessedRow + batchSize; row++) {
    const data = getRowData(sheet, row); // 各行のデータを取得
    Logger.log("Processing Row: " + row); // デバッグ用ログ
    const obj = generateObj('1228ca67d66580e2ad19c2abf5b0d546', data); // NotionのデータベースIDを入力
    postToNotion(obj);
  }

  // 処理済みの行番号を保存
  PropertiesService.getScriptProperties().setProperty('lastProcessedRow', lastProcessedRow + batchSize);
  Logger.log("Next Batch Start Row: " + (lastProcessedRow + batchSize)); // 次のバッチの開始行番号をログに記録

  // 最終行が処理されたか確認してプロパティをリセット
  if (lastProcessedRow + batchSize >= totalRows) {
    Logger.log("すべてのデータが処理されました。プロパティをリセットします。");
    PropertiesService.getScriptProperties().deleteProperty('lastProcessedRow');
    stopTrigger(); // すべてのデータが処理されたらトリガーを停止
  }
}
