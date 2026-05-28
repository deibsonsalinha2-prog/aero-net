const SHEET_NAME = 'clientes';

// Helper para retornar resposta com headers CORS
function corsResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// GET — suporta JSONP (callback) e fetch normal
function doGet(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1).map(row => {
    let obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });

  const callback = e.parameter && e.parameter.callback;
  if (callback) {
    // Resposta JSONP para compatibilidade (não usada mais, mas mantida como fallback)
    return ContentService.createTextOutput(callback + '(' + JSON.stringify(rows) + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return corsResponse(rows);
}

// POST — cadastrar novo cliente
function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);

  // Suporte a action via query param para simular PUT/DELETE via POST
  const action = e.parameter && e.parameter.action;

  const body = JSON.parse(e.postData.contents);

  if (action === 'put') {
    return _updateClient(sheet, body);
  }
  if (action === 'delete') {
    return _deleteClient(sheet, body);
  }

  // Cadastro normal
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
  return corsResponse({ id, created_at });
}

// PUT — atualizar cliente (tunnelado via POST?action=put)
function doPut(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const body = JSON.parse(e.postData.contents);
  return _updateClient(sheet, body);
}

// DELETE — excluir cliente (tunnelado via POST?action=delete)
function doDelete(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const body = JSON.parse(e.postData.contents);
  return _deleteClient(sheet, body);
}

function _updateClient(sheet, body) {
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
      return corsResponse({ success: true });
    }
  }
  return corsResponse({ error: 'Not found' });
}

function _deleteClient(sheet, body) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === body.id) {
      sheet.deleteRow(i + 1);
      return corsResponse({ success: true });
    }
  }
  return corsResponse({ error: 'Not found' });
}
