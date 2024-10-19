function myFunction() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const totalRows = sheet.getLastRow(); // データの総行数を取得
  Logger.log("Total Rows: " + totalRows); // デバッグ用ログ

  const batchSize = 50; // 一度に処理する行数を50に設定
  let lastProcessedRow = PropertiesService.getScriptProperties().getProperty('lastProcessedRow');
  lastProcessedRow = lastProcessedRow ? parseInt(lastProcessedRow, 10) : 0; // 前回処理した行を取得、初回は0
  Logger.log("Last Processed Row: " + lastProcessedRow); // デバッグ用ログ

  // すべての行が処理されている場合、処理を終了
  if (lastProcessedRow >= totalRows) {
    Logger.log("すべてのデータが処理されました。処理を終了します。");
    PropertiesService.getScriptProperties().deleteProperty('lastProcessedRow');
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
  }
}

function getRowData(sheet, row) {
  const headers = sheet.getRange(1, 1, 1, 30).getValues()[0]; // ヘッダーを取得
  const rowData = sheet.getRange(row, 1, 1, 30).getValues()[0]; // 指定行のデータを取得
  return { headers, rowData };
}

function generateObj(dbId, data) {
  const { headers, rowData } = data;
  const jsonData = convertSheetToJson(headers, rowData);
  
  return {
    parent: { database_id: dbId },
    properties: jsonData.properties,
    children: jsonData.children // 本文をchildrenとして追加
  };
}

function postToNotion(obj) {
  const options = {
    method: "POST",
    headers: {
      "Content-type": "application/json",
      "Authorization": "Bearer secret_lUPmAVV4QNXcztoxtizgRaP4FlfSWZKcWmMy5Fc6Edi", // Notion APIキー
      "Notion-Version": '2022-06-28',
    },
    payload: JSON.stringify(obj),
    muteHttpExceptions: true // これで詳細なエラーを取得可能
  };
  
  // 実行結果のレスポンスを取得し、エラー時に詳細をログに表示
  const response = UrlFetchApp.fetch('https://api.notion.com/v1/pages', options);
  Logger.log(response.getContentText()); // レスポンス内容をログに表示
}

function convertSheetToJson(headers, rowData) {
  const dateFields = ["登録日", "開始日", "期限日", "更新日"];
  const numberFields = ["発生バージョン", "共有", "添付", "実績時間", "予定時間", "マイルストーン"];
  const selectFields = ["優先度", "完了理由"];
  const statusFields = ["状態"];
  const multiSelectFields = ["カテゴリー名"];
  const richTextFields = ["キー", "種別", "親課題キー", "担当者", "登録者", "更新者"]; 

  let jsonData = { "properties": {}, "children": [] }; // childrenフィールドを追加

  headers.forEach((header, index) => {
    const value = rowData[index];
    if (!value) return;

    if (header === "件名") {
      jsonData.properties[header] = { "title": [{ "text": { "content": value.toString() } }] };
    } else if (header === "プロジェクト名") {
      jsonData.properties[header] = { "rich_text": [{ "text": { "content": value.toString() } }] };
    } else if (dateFields.includes(header)) {
      jsonData.properties[header] = { "date": { "start": Utilities.formatDate(new Date(value), Session.getScriptTimeZone(), "yyyy-MM-dd") } };
    } else if (numberFields.includes(header)) {
      jsonData.properties[header] = { "number": parseFloat(value) }; // 数値に変換
    } else if (selectFields.includes(header)) {
      jsonData.properties[header] = { "select": { "name": value.toString() } };
    } else if (statusFields.includes(header)) {
      jsonData.properties[header] = { "status": { "name": value.toString() } };
    } else if (multiSelectFields.includes(header)) {
      const multiSelectValues = value.split(',').map(v => ({ "name": v.trim() }));
      jsonData.properties[header] = { "multi_select": multiSelectValues };
    } else if (richTextFields.includes(header)) {
      jsonData.properties[header] = { "rich_text": [{ "text": { "content": value.toString() } }] };
    } else if (header === "詳細") {
      // 詳細フィールドをparagraphとしてchildrenに追加
      jsonData.children.push({
        "object": "block",
        "paragraph": {
          "rich_text": [{ "text": { "content": value.toString() } }]
        }
      });
      // 空白行を2行追加
      jsonData.children.push({
        "object": "block",
        "paragraph": {
          "rich_text": [{ "text": { "content": "" } }]
        }
      });
      jsonData.children.push({
        "object": "block",
        "paragraph": {
          "rich_text": [{ "text": { "content": "" } }]
        }
      });
      // コメント履歴を見出しとして追加
      jsonData.children.push({
        "object": "block",
        "heading_2": {
          "rich_text": [{ "text": { "content": "コメント履歴" } }]
        }
      });
    } else if (header.startsWith("コメント")) {
      // コメントを1行ずつ追加
      jsonData.children.push({
        "object": "block",
        "paragraph": {
          "rich_text": [{ "text": { "content": value.toString() } }]
        }
      });
      // 空白行を1行追加
      jsonData.children.push({
        "object": "block",
        "paragraph": {
          "rich_text": [{ "text": { "content": "" } }]
        }
      });
    }
  });

  return jsonData;
}
