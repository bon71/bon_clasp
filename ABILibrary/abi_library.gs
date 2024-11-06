const NOTION_TOKEN = PropertiesService.getScriptProperties().getProperty('NOTION_TOKEN');
const DATABASE_ID = PropertiesService.getScriptProperties().getProperty('DATABASE_ID');

/**
 * Notion データベースに新規データが作成されたかどうかをチェックし、必要な情報を更新する関数
 */
function checkAndUpdateNotion() {
  try {
    const url = `https://api.notion.com/v1/databases/${DATABASE_ID}/query`;
    const options = {
      method: 'post',
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      }
    };

    const response = UrlFetchApp.fetch(url, options);
    const data = JSON.parse(response.getContentText());

    data.results.forEach(page => {
      const isbn13 = page.properties.ISBN13.rich_text[0].text.content;
      if (isbn13) {
        updateNotionPage(page.id, isbn13);
      }
    });
  } catch (e) {
    console.error('エラーが発生しました:', e.message);
  }
}

/**
 * Notion ページのプロパティを更新する関数
 * @param {string} pageId - Notion ページの ID
 * @param {string} isbn13 - ISBN13 コード
 */
function updateNotionPage(pageId, isbn13) {
  try {
    // ISBN13のバリデーションとハイフンの除去
    const cleanedIsbn13 = isbn13.replace(/-/g, '');
    if (!/^978\d{10}$/.test(cleanedIsbn13)) {
      throw new Error('無効なISBN13コードです');
    }

    const imageUrl = `https://ndlsearch.ndl.go.jp/thumbnail/${cleanedIsbn13}.jpg`;
    const bookInfoUrl = `https://api.openbd.jp/v1/get?isbn=${cleanedIsbn13}&pretty`;
    const bookInfoResponse = UrlFetchApp.fetch(bookInfoUrl);
    const bookInfo = JSON.parse(bookInfoResponse.getContentText())[0].summary;

    const url = `https://api.notion.com/v1/pages/${pageId}`;
    const options = {
      method: 'patch',
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      payload: JSON.stringify({
        properties: {
          'タイトル': {
            title: [
              {
                text: {
                  content: bookInfo.title || 'タイトルなし'
                }
              }
            ]
          },
          '著者': {
            rich_text: [
              {
                text: {
                  content: bookInfo.author || '著者なし'
                }
              }
            ]
          },
          '出版社': {
            rich_text: [
              {
                text: {
                  content: bookInfo.publisher || '出版社なし'
                }
              }
            ]
          },
          '出版日': {
            rich_text: [
              {
                text: {
                  content: bookInfo.pubdate || '出版日なし'
                }
              }
            ]
          },
          '画像リンク': {
            url: imageUrl
          }
        }
      })
    };

    const response = UrlFetchApp.fetch(url, options);
    console.log(`Notion ページを更新しました: ${pageId}`);
  } catch (e) {
    console.error(`Notion ページの更新に失敗しました: ${pageId}`, e.message);
  }
}
