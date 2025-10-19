import crypto from 'crypto';
import fetch from 'node-fetch';
import FormData from 'form-data';

function cors(res){
  const allow = process.env.CORS_ORIGIN || '*';
  res.setHeader('Access-Control-Allow-Origin', allow);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req, res){
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({error:'Method not allowed'});

  try{
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const sample = Buffer.concat(chunks);

    const accessKey = process.env.ACR_ACCESS_KEY;
    const accessSecret = process.env.ACR_ACCESS_SECRET;
    const host = process.env.ACR_HOST;
    if (!accessKey || !accessSecret || !host) return res.status(500).json({error:'Missing ACR env'});

    const httpMethod = 'POST';
    const httpUri = '/v1/identify';
    const dataType = 'audio';
    const signatureVersion = '1';
    const timestamp = Math.floor(Date.now() / 1000).toString();

    const stringToSign = [httpMethod, httpUri, accessKey, dataType, signatureVersion, timestamp].join('\n');
    const sig = crypto.createHmac('sha1', accessSecret).update(Buffer.from(stringToSign, 'utf-8')).digest('base64');

    const form = new FormData();
    form.append('access_key', accessKey);
    form.append('sample_bytes', sample.length);
    form.append('sample', sample, { filename: 'sample.wav', contentType: 'audio/wav' });
    form.append('timestamp', timestamp);
    form.append('signature', sig);
    form.append('data_type', dataType);
    form.append('signature_version', signatureVersion);

    const url = `https://${host}${httpUri}`;
    const resp = await fetch(url, { method: 'POST', body: form });
    const json = await resp.json();

    let artist=null, title=null, album=null;
    try{
      const md = json?.metadata;
      if (md?.music?.length){
        const m = md.music[0];
        title = m.title || null;
        artist = (m.artists && m.artists[0]?.name) || null;
        album = m.album?.name || null;
      }
    }catch(e){}

    return res.status(200).json({ raw: json, artist, title, album });
  }catch(e){
    console.error(e);
    return res.status(500).json({error: e.message});
  }
}
