import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import crypto from 'node:crypto';

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

const SAVES_TABLE = process.env.SAVES_TABLE;
const TRANSFERS_TABLE = process.env.TRANSFERS_TABLE;

const MAX_BODY_SIZE = 100 * 1024; // 100KB

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    },
    body: JSON.stringify(body),
  };
}

// POST /api/save
async function handleSave(event) {
  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return response(400, { success: false, error: 'リクエストが不正です' });
  }

  if ((event.body || '').length > MAX_BODY_SIZE) {
    return response(400, { success: false, error: 'データが大きすぎます' });
  }

  const { deviceId, data } = body;
  if (!deviceId || typeof deviceId !== 'string') {
    return response(400, { success: false, error: 'deviceId が必要です' });
  }
  if (!data || typeof data !== 'object') {
    return response(400, { success: false, error: 'data が必要です' });
  }

  const updatedAt = new Date().toISOString();
  await ddb.send(new PutCommand({
    TableName: SAVES_TABLE,
    Item: { deviceId, data, updatedAt },
  }));

  return response(200, { success: true, savedAt: updatedAt });
}

// GET /api/save/{deviceId}
async function handleLoad(event) {
  const deviceId = event.pathParameters?.deviceId;
  if (!deviceId) {
    return response(400, { success: false, error: 'deviceId が必要です' });
  }

  const result = await ddb.send(new GetCommand({
    TableName: SAVES_TABLE,
    Key: { deviceId },
  }));

  if (!result.Item) {
    return response(404, { success: false, error: 'セーブデータがみつかりません' });
  }

  return response(200, { success: true, data: result.Item.data });
}

// POST /api/transfer/generate
async function handleGenerateTransfer(event) {
  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return response(400, { success: false, error: 'リクエストが不正です' });
  }

  const { deviceId } = body;
  if (!deviceId || typeof deviceId !== 'string') {
    return response(400, { success: false, error: 'deviceId が必要です' });
  }

  // セーブデータを取得
  const saveResult = await ddb.send(new GetCommand({
    TableName: SAVES_TABLE,
    Key: { deviceId },
  }));

  if (!saveResult.Item) {
    return response(404, { success: false, error: 'セーブデータがみつかりません。先にアップロードしてください' });
  }

  // 6桁コード生成（衝突チェック付き）
  let code;
  for (let attempt = 0; attempt < 5; attempt++) {
    code = crypto.randomInt(0, 1000000).toString().padStart(6, '0');
    const existing = await ddb.send(new GetCommand({
      TableName: TRANSFERS_TABLE,
      Key: { code },
    }));
    if (!existing.Item) break;
    if (attempt === 4) {
      return response(500, { success: false, error: 'コード生成に失敗しました。もう一度お試しください' });
    }
  }

  const now = Date.now();
  const expiresAt = new Date(now + 24 * 60 * 60 * 1000).toISOString();
  const ttl = Math.floor(now / 1000) + 24 * 60 * 60;

  await ddb.send(new PutCommand({
    TableName: TRANSFERS_TABLE,
    Item: {
      code,
      deviceId,
      data: saveResult.Item.data,
      expiresAt,
      ttl,
      used: false,
    },
  }));

  return response(200, { success: true, code, expiresAt });
}

// POST /api/transfer/redeem
async function handleRedeemTransfer(event) {
  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return response(400, { success: false, error: 'リクエストが不正です' });
  }

  const { code, newDeviceId } = body;
  if (!code || !/^\d{6}$/.test(code)) {
    return response(400, { success: false, error: '6桁のひきつぎコードを入力してください' });
  }
  if (!newDeviceId || typeof newDeviceId !== 'string') {
    return response(400, { success: false, error: 'newDeviceId が必要です' });
  }

  const result = await ddb.send(new GetCommand({
    TableName: TRANSFERS_TABLE,
    Key: { code },
  }));

  if (!result.Item) {
    return response(404, { success: false, error: 'ひきつぎコードがみつかりません' });
  }

  const entry = result.Item;

  if (entry.used) {
    return response(400, { success: false, error: 'このコードはすでにつかわれています' });
  }

  if (new Date(entry.expiresAt) < new Date()) {
    return response(400, { success: false, error: 'このコードのきげんがきれています' });
  }

  // used: true に更新
  await ddb.send(new PutCommand({
    TableName: TRANSFERS_TABLE,
    Item: { ...entry, used: true },
  }));

  return response(200, { success: true, data: entry.data });
}

export async function handler(event) {
  const { resource, httpMethod } = event;

  try {
    if (resource === '/api/save' && httpMethod === 'POST') {
      return await handleSave(event);
    }
    if (resource === '/api/save/{deviceId}' && httpMethod === 'GET') {
      return await handleLoad(event);
    }
    if (resource === '/api/transfer/generate' && httpMethod === 'POST') {
      return await handleGenerateTransfer(event);
    }
    if (resource === '/api/transfer/redeem' && httpMethod === 'POST') {
      return await handleRedeemTransfer(event);
    }

    return response(404, { success: false, error: 'Not Found' });
  } catch (err) {
    console.error('Unhandled error:', err);
    return response(500, { success: false, error: 'サーバーエラーが発生しました' });
  }
}
