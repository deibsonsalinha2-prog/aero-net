var SHEET_NAME = 'clientes';

function doGet(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var rows = [];

  for (var i = 1; i < data.length; i++) {
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      obj[headers[j]] = data[i][j];
    }
    rows.push(obj);
  }

  var callback = e.parameter && e.parameter.callback;
  if (callback) {
    return ContentService
      .createTextOutput(callback + '(' + JSON.stringify(rows) + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService
    .createTextOutput(JSON.stringify(rows))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  var body = JSON.parse(e.postData.contents);

  if (body._method === 'PUT') {
    return atualizarCliente(sheet, body);
  }

  if (body._method === 'DELETE') {
    return excluirCliente(sheet, body);
  }

  // Cadastrar novo cliente
  var id = Utilities.getUuid();
  var created_at = new Date().toISOString();

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

  return ContentService
    .createTextOutput(JSON.stringify({ id: id, created_at: created_at }))
    .setMimeType(ContentService.MimeType.JSON);
}

function atualizarCliente(sheet, body) {
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === body.id) {
      var novosDados = [
        body.nome,
        body.documento,
        body.telefone,
        body.endereco,
        body.plano,
        body.valor_mensal,
        body.vencimento,
        body.status
      ];
      sheet.getRange(i + 1, 2, 1, 8).setValues([novosDados]);
      return ContentService
        .createTextOutput(JSON.stringify({ success: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  return ContentService
    .createTextOutput(JSON.stringify({ error: 'Not found' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function excluirCliente(sheet, body) {
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === body.id) {
      sheet.deleteRow(i + 1);
      return ContentService
        .createTextOutput(JSON.stringify({ success: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  return ContentService
    .createTextOutput(JSON.stringify({ error: 'Not found' }))
    .setMimeType(ContentService.MimeType.JSON);
}
