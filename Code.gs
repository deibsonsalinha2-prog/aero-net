const SHEET_NAME = 'clientes';

function doGet(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1).map(row => {
    let obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
  return ContentService.createTextOutput(JSON.stringify(rows))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const body = JSON.parse(e.postData.contents);
  const id = Utilities.getUuid();
  const created_at = new Date().toISOString();
  sheet.appendRow([
    id,
    body.nome,
    body.documento,
    body.telefone,
    body.endereco,
    body.plano,
    body.valor_mensal,
    body.vencimento,
    body.status,
    created_at
  ]);
  return ContentService.createTextOutput(JSON.stringify({ id, created_at }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPut(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const body = JSON.parse(e.postData.contents);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === body.id) {
      sheet.getRange(i + 1, 2, 1, 8).setValues([[
        body.nome,
        body.documento,
        body.telefone,
        body.endereco,
        body.plano,
        body.valor_mensal,
        body.vencimento,
        body.status
      ]]);
      return ContentService.createTextOutput(JSON.stringify({ success: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }
  return ContentService.createTextOutput(JSON.stringify({ error: 'Not found' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doDelete(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const body = JSON.parse(e.postData.contents);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === body.id) {
      sheet.deleteRow(i + 1);
      return ContentService.createTextOutput(JSON.stringify({ success: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }
  return ContentService.createTextOutput(JSON.stringify({ error: 'Not found' }))
    .setMimeType(ContentService.MimeType.JSON);
}
